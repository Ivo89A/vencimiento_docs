import { getActor } from "@/domains/auth/authorization";
import { createStation } from "@/domains/stations/station.service";
import { listStations } from "@/domains/stations/station.queries";
import { apiResponse, readJson, requireSameOrigin } from "@/lib/http";

export async function GET(request: Request) {
  return apiResponse(async () => listStations(
    await getActor(request.headers), Object.fromEntries(new URL(request.url).searchParams),
  ));
}

export async function POST(request: Request) {
  return apiResponse(async () => {
    requireSameOrigin(request);
    const actor = await getActor(request.headers);
    return createStation(actor, await readJson(request));
  }, 201);
}
