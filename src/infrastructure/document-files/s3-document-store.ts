import { createHash, randomUUID } from "node:crypto";
import { addAbortSignal, Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { DocumentFileEnv } from "@/lib/env";
import { DocumentFileInfrastructureError } from "./document-file.errors";

/** Internal reference only: never serialize S3 keys, ETags or provider versions to a browser. */
export type StoredDocumentObject = {
  key: string;
  sha256: string;
  size: number;
  etag: string;
  versionId?: string;
};

const keyPattern = /^quarantine\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

class UnsignedProbeRequest extends Error {
  constructor(readonly url: URL) { super("Unsigned probe captured"); }
}

/** No public ACL, presigned link, listing, bucket creation or broad deletion surface. */
export class S3DocumentStore {
  private readonly client: S3Client;

  constructor(private readonly config: DocumentFileEnv) {
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT, region: config.S3_REGION, forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        ...(config.S3_SESSION_TOKEN ? { sessionToken: config.S3_SESSION_TOKEN } : {}),
      },
      maxAttempts: 2, followRegionRedirects: false,
      requestHandler: { connectionTimeout: Math.min(5000, config.DOCUMENT_FILES_TIMEOUT_MS), requestTimeout: config.DOCUMENT_FILES_TIMEOUT_MS },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  async putQuarantine(content: Uint8Array): Promise<StoredDocumentObject> {
    this.requireSize(content.byteLength);
    const snapshot = Buffer.from(content);
    const key = `quarantine/${randomUUID()}`;
    const sha256 = createHash("sha256").update(snapshot).digest("hex");
    try {
      const response = await this.client.send(new PutObjectCommand({
        Bucket: this.config.S3_BUCKET, Key: key, Body: snapshot,
        ContentLength: snapshot.byteLength, ContentType: "application/octet-stream",
        CacheControl: "private, no-store", IfNoneMatch: "*", Metadata: { sha256 },
      }), { abortSignal: AbortSignal.timeout(this.config.DOCUMENT_FILES_TIMEOUT_MS) });
      if (!response.ETag) throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
      return { key, sha256, size: content.byteLength, etag: response.ETag, ...(response.VersionId ? { versionId: response.VersionId } : {}) };
    } catch (error) { this.rethrowSafe(error); }
  }

  async readQuarantine(reference: StoredDocumentObject): Promise<Buffer> {
    this.requireReference(reference);
    const signal = AbortSignal.timeout(this.config.DOCUMENT_FILES_TIMEOUT_MS);
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.config.S3_BUCKET, Key: reference.key, IfMatch: reference.etag,
        ...(reference.versionId ? { VersionId: reference.versionId } : {}),
      }), { abortSignal: signal });
      const body = response.Body;
      if (!(body instanceof Readable)) throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
      // Bound the actual stream, not only the provider's Content-Length. Abort stalled bodies too.
      addAbortSignal(signal, body);
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        if (response.ContentLength !== undefined && response.ContentLength !== reference.size) {
          throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
        }
        for await (const chunk of body) {
          if (!(chunk instanceof Uint8Array)) throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
          size += chunk.byteLength;
          if (size > reference.size || size > this.config.DOCUMENT_FILES_MAX_BYTES) throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
          chunks.push(Buffer.from(chunk));
        }
      } finally { body.destroy(); }
      const content = Buffer.concat(chunks);
      if (size !== reference.size || createHash("sha256").update(content).digest("hex") !== reference.sha256) {
        throw new DocumentFileInfrastructureError("STORAGE_INTEGRITY");
      }
      return content;
    } catch (error) { this.rethrowSafe(error); }
  }

  /** Opt-in CLI probe: only its newly created random object is removed, including its version. */
  async verifyPrivateStorage(): Promise<void> {
    const content = Buffer.from(`gestion-documentos private storage probe ${randomUUID()}`, "utf8");
    let reference: StoredDocumentObject | undefined;
    let primaryError: unknown;
    try {
      reference = await this.putQuarantine(content);
      await this.readQuarantine(reference);
      await this.requireAnonymousDenied(reference.key);
    } catch (error) { primaryError = error; }
    let cleanupFailed = false;
    if (reference) {
      try {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: reference.key,
          ...(reference.versionId ? { VersionId: reference.versionId } : {}),
        }), { abortSignal: AbortSignal.timeout(this.config.DOCUMENT_FILES_TIMEOUT_MS) });
        await this.confirmProbeDeleted(reference);
      } catch { cleanupFailed = true; }
    }
    // Never mask a public-access or integrity error with a subsequent cleanup failure.
    if (primaryError) {
      if (cleanupFailed) throw new DocumentFileInfrastructureError(primaryError instanceof DocumentFileInfrastructureError ? primaryError.code : "STORAGE_UNAVAILABLE", true);
      this.rethrowSafe(primaryError);
    }
    if (cleanupFailed) throw new DocumentFileInfrastructureError("STORAGE_CLEANUP_FAILED");
  }

  close() { this.client.destroy(); }

  private async requireAnonymousDenied(key: string) {
    // Let the SDK resolve path-style/virtual-host addressing, but capture BEFORE auth signing
    // and BEFORE transport. Only the URL is used; no signed headers/cookies are copied.
    const command = new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key });
    command.middlewareStack.add(() => async (args) => {
      const request = args.request as { protocol: string; hostname: string; port?: number; path: string };
      const hostname = request.hostname.includes(":") && !request.hostname.startsWith("[") ? `[${request.hostname}]` : request.hostname;
      const url = new URL(`${request.protocol}//${hostname}${request.port ? `:${request.port}` : ""}${request.path}`);
      throw new UnsignedProbeRequest(url);
    }, { step: "build", name: "captureUnsignedDocumentProbe" });
    let url: URL | undefined;
    try { await this.client.send(command); }
    catch (error) { if (error instanceof UnsignedProbeRequest) url = error.url; else this.rethrowSafe(error); }
    if (!url) throw new DocumentFileInfrastructureError("STORAGE_PRIVACY_UNVERIFIED");
    try {
      const response = await fetch(url, { method: "GET", redirect: "manual", credentials: "omit",
        signal: AbortSignal.timeout(this.config.DOCUMENT_FILES_TIMEOUT_MS),
      });
      await response.body?.cancel();
      if (response.status === 200 || response.status === 206) throw new DocumentFileInfrastructureError("STORAGE_PUBLIC_ACCESS");
      if (![401, 403, 404].includes(response.status)) throw new DocumentFileInfrastructureError("STORAGE_PRIVACY_UNVERIFIED");
    } catch (error) {
      if (error instanceof DocumentFileInfrastructureError) throw error;
      throw new DocumentFileInfrastructureError("STORAGE_PRIVACY_UNVERIFIED");
    }
  }

  private async confirmProbeDeleted(reference: StoredDocumentObject) {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: reference.key,
        ...(reference.versionId ? { VersionId: reference.versionId } : {}),
      }), { abortSignal: AbortSignal.timeout(this.config.DOCUMENT_FILES_TIMEOUT_MS) });
      if (response.Body instanceof Readable) response.Body.destroy();
    } catch (error) {
      const metadata = (error as { $metadata?: { httpStatusCode?: number } } | null)?.$metadata;
      if (metadata?.httpStatusCode === 404) return;
    }
    throw new DocumentFileInfrastructureError("STORAGE_CLEANUP_FAILED");
  }

  private requireSize(size: number) {
    if (!Number.isInteger(size) || size < 1 || size > this.config.DOCUMENT_FILES_MAX_BYTES) throw new DocumentFileInfrastructureError("FILE_SIZE");
  }

  private requireReference(reference: StoredDocumentObject) {
    if (!keyPattern.test(reference.key) || !/^[0-9a-f]{64}$/.test(reference.sha256) || !reference.etag ||
      /[\r\n]/.test(reference.etag) || (reference.versionId !== undefined && !reference.versionId)) {
      throw new DocumentFileInfrastructureError("FILE_REFERENCE");
    }
    this.requireSize(reference.size);
  }

  private rethrowSafe(error: unknown): never {
    if (error instanceof DocumentFileInfrastructureError) throw error;
    throw new DocumentFileInfrastructureError("STORAGE_UNAVAILABLE");
  }
}
