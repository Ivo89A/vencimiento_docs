import { getActor } from "@/domains/auth/authorization";
import { exportLegalEntitiesCsv } from "@/domains/legal-entities/legal-entity.service";
import { apiResponse } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const actor = await getActor(request.headers);
    const search = new URL(request.url).searchParams;
    const ids = search.getAll("ids");
    search.delete("ids");
    const csv = await exportLegalEntitiesCsv(actor, Object.fromEntries(search), ids);
    return new Response(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="razones-sociales.csv"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return apiResponse(async () => { throw error; }); }
}
