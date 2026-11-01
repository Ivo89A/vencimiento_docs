import { getActor } from "@/domains/auth/authorization";
import { getStation } from "@/domains/stations/station.queries";
import { changeStationActive, updateStation } from "@/domains/stations/station.service";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return apiResponse(async () => getStation(await getActor(request.headers), (await context.params).id));
}

export async function PUT(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return updateStation(actor, (await context.params).id, await readJson(request));
  });
}

export async function PATCH(request: Request, context: Context) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return changeStationActive(actor, (await context.params).id, await readJson(request));
  });
}
