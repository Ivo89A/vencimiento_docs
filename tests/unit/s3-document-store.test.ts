import { createServer, type IncomingHttpHeaders } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { getDocumentFileEnv } from "@/lib/env";
import { S3DocumentStore } from "@/infrastructure/document-files/s3-document-store";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

type FixtureOptions = { publicRead?: boolean; privacyStatus?: number; tamper?: boolean; overrun?: boolean; stall?: boolean; deny?: boolean; ignoreDelete?: boolean; versioned?: boolean };

/** HTTP protocol fixture for the real AWS SDK; not a deployed S3 provider or policy audit. */
async function storageFixture(options: FixtureOptions = {}) {
  const objects = new Map<string, Buffer>();
  const calls: Array<{ method: string; path: string; authenticated: boolean; headers: IncomingHttpHeaders; versionId: string | null }> = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, "http://127.0.0.1");
    const authenticated = !!request.headers.authorization;
    calls.push({ method: request.method!, path: url.pathname, authenticated,
      headers: { "if-none-match": request.headers["if-none-match"], "cache-control": request.headers["cache-control"], "x-amz-acl": request.headers["x-amz-acl"] },
      versionId: url.searchParams.get("versionId"),
    });
    if (options.deny) {
      response.writeHead(403, { "Content-Type": "application/xml" });
      response.end("<Error><Code>AccessDenied</Code><Message>fake-secret-provider-payload</Message></Error>"); return;
    }
    if (!authenticated) {
      response.writeHead(options.privacyStatus ?? (options.publicRead ? 200 : 403));
      response.end(options.publicRead ? objects.get(url.pathname) : "denied"); return;
    }
    if (request.method === "PUT") {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      if (objects.has(url.pathname)) { response.writeHead(412); response.end(); return; }
      objects.set(url.pathname, Buffer.concat(chunks));
      response.writeHead(200, { ETag: '"fixture-etag"', ...(options.versioned ? { "x-amz-version-id": "fixture-version" } : {}) });
      response.end(); return;
    }
    if (request.method === "DELETE") {
      if (!options.ignoreDelete) objects.delete(url.pathname);
      response.writeHead(204); response.end(); return;
    }
    const stored = objects.get(url.pathname);
    if (!stored) {
      response.writeHead(404, { "Content-Type": "application/xml" });
      response.end("<Error><Code>NoSuchKey</Code><Message>not found</Message></Error>"); return;
    }
    response.writeHead(200, { ETag: '"fixture-etag"' });
    if (options.stall) { response.flushHeaders(); return; }
    const content = options.tamper ? Buffer.alloc(stored.length, 1) : options.overrun ? Buffer.concat([stored, Buffer.alloc(20)]) : stored;
    response.write(content); response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_LISTEN");
  const config = getDocumentFileEnv({ NODE_ENV: "test", S3_ENDPOINT: `http://127.0.0.1:${address.port}`,
    S3_REGION: "us-east-1", S3_BUCKET: "gestion-test", S3_ACCESS_KEY_ID: "unit-access", S3_SECRET_ACCESS_KEY: "unit-secret",
    S3_FORCE_PATH_STYLE: "true", ANTIVIRUS_HOST: "127.0.0.1", DOCUMENT_FILES_TIMEOUT_MS: "500", DOCUMENT_FILES_MAX_BYTES: "1024",
  });
  const storage = new S3DocumentStore(config);
  cleanups.push(async () => { storage.close(); server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  return { storage, objects, calls };
}

describe("Adaptador S3 privado con AWS SDK real y fixture HTTP local", () => {
  it("usa claves aleatorias, If-None-Match y caché privada sin ACL pública", async () => {
    const { storage, calls } = await storageFixture();
    const content = Buffer.from("test document");
    const first = await storage.putQuarantine(content);
    const second = await storage.putQuarantine(content);
    expect(first.key).toMatch(/^quarantine\/[0-9a-f-]{36}$/);
    expect(first.key).not.toBe(second.key);
    expect(await storage.readQuarantine(first)).toEqual(content);
    const put = calls.find((call) => call.method === "PUT")!;
    expect(put.authenticated).toBe(true);
    expect(put.headers["if-none-match"]).toBe("*");
    expect(put.headers["cache-control"]).toBe("private, no-store");
    expect(put.headers["x-amz-acl"]).toBeUndefined();
  });
  it("copia la entrada antes de esperar al proveedor", async () => {
    const { storage } = await storageFixture();
    const content = Buffer.from("original");
    const writing = storage.putQuarantine(content);
    content.fill(0);
    const reference = await writing;
    expect((await storage.readQuarantine(reference)).toString()).toBe("original");
  });
  it("rechaza referencias inválidas y tamaños fuera de límite antes de contactar S3", async () => {
    const { storage, calls } = await storageFixture();
    await expect(storage.putQuarantine(Buffer.alloc(0))).rejects.toMatchObject({ code: "FILE_SIZE" });
    await expect(storage.putQuarantine(Buffer.alloc(1025))).rejects.toMatchObject({ code: "FILE_SIZE" });
    await expect(storage.readQuarantine({ key: "../public/file", sha256: "0".repeat(64), size: 10, etag: "x" })).rejects.toMatchObject({ code: "FILE_REFERENCE" });
    expect(calls).toHaveLength(0);
  });
  it.each([{ tamper: true }, { overrun: true }])("rechaza bytes alterados o excedidos: %o", async (options) => {
    const { storage } = await storageFixture(options);
    const reference = await storage.putQuarantine(Buffer.from("test document"));
    await expect(storage.readQuarantine(reference)).rejects.toMatchObject({ code: "STORAGE_INTEGRITY" });
  });
  it("corta una lectura que se queda bloqueada después de los headers", async () => {
    const { storage } = await storageFixture({ stall: true });
    const reference = await storage.putQuarantine(Buffer.from("test"));
    await expect(storage.readQuarantine(reference)).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
  });
  it("no expone el payload del proveedor en errores", async () => {
    const { storage } = await storageFixture({ deny: true });
    try { await storage.putQuarantine(Buffer.from("test")); throw new Error("EXPECTED_REJECTION"); }
    catch (error) {
      expect(error).toMatchObject({ code: "STORAGE_UNAVAILABLE" });
      expect(String(error)).not.toContain("fake-secret-provider-payload");
      expect(String(error)).not.toContain("unit-secret");
    }
  });
  it("el diagnóstico prueba acceso anónimo sin enviar Authorization y elimina su objeto", async () => {
    const { storage, objects, calls } = await storageFixture();
    await storage.verifyPrivateStorage();
    expect(calls.filter((call) => !call.authenticated)).toHaveLength(1);
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
    expect(objects.size).toBe(0);
  });
  it("rechaza acceso público aunque la lectura autenticada funcione", async () => {
    const { storage, objects } = await storageFixture({ publicRead: true });
    await expect(storage.verifyPrivateStorage()).rejects.toMatchObject({ code: "STORAGE_PUBLIC_ACCESS" });
    expect(objects.size).toBe(0);
  });
  it("no interpreta un redirect anónimo como prueba de privacidad", async () => {
    const { storage, objects } = await storageFixture({ privacyStatus: 302 });
    await expect(storage.verifyPrivateStorage()).rejects.toMatchObject({ code: "STORAGE_PRIVACY_UNVERIFIED" });
    expect(objects.size).toBe(0);
  });
  it("no comunica limpieza exitosa si el proveedor ignora DELETE", async () => {
    const { storage } = await storageFixture({ ignoreDelete: true });
    await expect(storage.verifyPrivateStorage()).rejects.toMatchObject({ code: "STORAGE_CLEANUP_FAILED" });
  });
  it("conserva el fallo de privacidad e informa también el fallo de limpieza", async () => {
    const { storage } = await storageFixture({ publicRead: true, ignoreDelete: true });
    await expect(storage.verifyPrivateStorage()).rejects.toMatchObject({ code: "STORAGE_PUBLIC_ACCESS", cleanupFailed: true });
  });
  it("lee y elimina la versión exacta del objeto de diagnóstico", async () => {
    const { storage, calls } = await storageFixture({ versioned: true });
    await storage.verifyPrivateStorage();
    expect(calls.find((call) => call.method === "DELETE")?.versionId).toBe("fixture-version");
    expect(calls.some((call) => call.method === "GET" && call.authenticated && call.versionId === "fixture-version")).toBe(true);
  });
});
