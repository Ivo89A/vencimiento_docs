import { getActor } from "@/domains/auth/authorization";
import { getDocumentPresentation } from "@/domains/documents/document-presentation.queries";
import { changeDocumentPresentation } from "@/domains/documents/document-presentation.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request, context: RouteContext<"/api/document-presentations/[id]">) {
  return apiResponse(async () => getDocumentPresentation(await getActor(request.headers), (await context.params).id));
}

export async function PATCH(request: Request, context: RouteContext<"/api/document-presentations/[id]">) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return changeDocumentPresentation(actor, (await context.params).id, await readJson(request));
  });
}
