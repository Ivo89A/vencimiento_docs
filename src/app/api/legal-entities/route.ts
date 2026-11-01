import { getActor } from "@/domains/auth/authorization";
import { createLegalEntity, listLegalEntities } from "@/domains/legal-entities/legal-entity.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request) {
  return apiResponse(async () => listLegalEntities(await getActor(request.headers), Object.fromEntries(new URL(request.url).searchParams)));
}

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return createLegalEntity(actor, await readJson(request));
  }, 201);
}
