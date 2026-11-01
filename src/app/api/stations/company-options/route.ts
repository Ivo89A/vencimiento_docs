import { getActor } from "@/domains/auth/authorization";
import { listStationCompanyOptions } from "@/domains/stations/station.queries";
import { apiResponse } from "@/lib/http";

export async function GET(request: Request) {
  return apiResponse(async () => listStationCompanyOptions(
    await getActor(request.headers), Object.fromEntries(new URL(request.url).searchParams),
  ));
}
