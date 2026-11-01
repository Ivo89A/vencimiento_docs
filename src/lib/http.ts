import { DomainError, publicError } from "./errors";
import { getRuntimeEnv } from "./env";

export function requireSameOrigin(request: Request) {
  const expected = new URL(getRuntimeEnv().BETTER_AUTH_URL).origin;
  if (request.headers.get("origin") !== expected) {
    throw new DomainError("INVALID_ORIGIN", "Origen de la solicitud no autorizado.", 403);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";")[0].trim();
  if (type !== "application/json") throw new DomainError("CONTENT_TYPE", "Se requiere JSON.", 415);
  if (!request.body) throw new DomainError("BODY", "La solicitud está vacía.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 64 * 1024) {
      await reader.cancel();
      throw new DomainError("TOO_LARGE", "La solicitud excede el tamaño permitido.", 413);
    }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new DomainError("INVALID_JSON", "JSON inválido.", 400); }
}

export async function apiResponse(operation: () => Promise<unknown>, status = 200) {
  try {
    return Response.json({ data: await operation() }, { status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers: { "Cache-Control": "private, no-store" } });
  }
}
