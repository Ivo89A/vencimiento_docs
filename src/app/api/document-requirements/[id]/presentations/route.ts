import { getActor } from "@/domains/auth/authorization";
import { listDocumentPresentations } from "@/domains/documents/document-presentation.queries";
import { createDocumentPresentation } from "@/domains/documents/document-presentation.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request, context: RouteContext<"/api/document-requirements/[id]/presentations">) {
  return apiResponse(async () => {
    const actor = await getActor(request.headers);
    const { id } = await context.params;
    return listDocumentPresentations(actor, id, Object.fromEntries(new URL(request.url).searchParams));
  });
}

export async function POST(request: Request, context: RouteContext<"/api/document-requirements/[id]/presentations">) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    const { id } = await context.params;
    return createDocumentPresentation(actor, id, await readJson(request));
  }, 201);
}
