import { getActor } from "@/domains/auth/authorization";
import { reviseDocumentType, changeDocumentTypeActive } from "@/domains/documents/document-type.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return reviseDocumentType(actor, (await context.params).id, await readJson(request));
  });
}
export async function PATCH(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return changeDocumentTypeActive(actor, (await context.params).id, await readJson(request));
  });
}
