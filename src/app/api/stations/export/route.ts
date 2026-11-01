import { getActor } from "@/domains/auth/authorization";
import { exportStationsCsv } from "@/domains/stations/station-export.service";
import { apiResponse } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const actor = await getActor(request.headers);
    const query = new URL(request.url).searchParams;
    const ids = query.getAll("ids");
    query.delete("ids");
    const csv = await exportStationsCsv(actor, Object.fromEntries(query), ids);
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="estaciones.csv"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiResponse(async () => { throw error; }); }
}
