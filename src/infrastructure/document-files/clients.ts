import { getDocumentFileEnv } from "@/lib/env";
import { ClamAvScanner } from "./clamav-scanner";
import { S3DocumentStore } from "./s3-document-store";

export function createDocumentFileClients(source: NodeJS.ProcessEnv = process.env) {
  const config = getDocumentFileEnv(source);
  return {
    storage: new S3DocumentStore(config),
    scanner: new ClamAvScanner({ host: config.ANTIVIRUS_HOST, port: config.ANTIVIRUS_PORT,
      maxBytes: config.DOCUMENT_FILES_MAX_BYTES, timeoutMs: config.DOCUMENT_FILES_TIMEOUT_MS }),
  };
}
