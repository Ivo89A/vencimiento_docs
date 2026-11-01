import { getActor } from "@/domains/auth/authorization";
import { listDocumentTypes } from "@/domains/documents/document.queries";
import { createDocumentType } from "@/domains/documents/document-type.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request) {
  return apiResponse(async () => listDocumentTypes(await getActor(request.headers), Object.fromEntries(new URL(request.url).searchParams)));
}
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return createDocumentType(actor, await readJson(request));
  }, 201);
}
