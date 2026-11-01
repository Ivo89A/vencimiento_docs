import { getActor } from "@/domains/auth/authorization";
import { listDocumentRequirements } from "@/domains/documents/document.queries";
import { assignDocumentRequirement } from "@/domains/documents/document-requirement.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request) {
  return apiResponse(async () => listDocumentRequirements(await getActor(request.headers), Object.fromEntries(new URL(request.url).searchParams)));
}
export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return assignDocumentRequirement(actor, await readJson(request));
  }, 201);
}
