import { getActor } from "@/domains/auth/authorization";
import { changeLegalEntityActive, getLegalEntity, updateLegalEntity } from "@/domains/legal-entities/legal-entity.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return apiResponse(async () => getLegalEntity(await getActor(request.headers), (await context.params).id));
}

export async function PUT(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    return updateLegalEntity(await getActor(request.headers), (await context.params).id, await readJson(request));
  });
}

export async function PATCH(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    return changeLegalEntityActive(await getActor(request.headers), (await context.params).id, await readJson(request));
  });
}
