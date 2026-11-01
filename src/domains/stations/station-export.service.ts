import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { requirePermission, type Actor } from "@/domains/auth/access-policy";
import { csvDocument } from "@/lib/csv";
import { DomainError } from "@/lib/errors";
import { operationalStatusLabels, stationIdSchema, stationQuerySchema } from "./station.schemas";
import { stationWhere } from "./station.queries";

export async function exportStationsCsv(actor: Actor, input: unknown, rawIds: unknown) {
  requirePermission(actor, "stations:read");
  requirePermission(actor, "stations:export");
  const query = stationQuerySchema.parse(input);
  const ids = z.array(stationIdSchema).max(100, "Seleccioná hasta 100 estaciones.").parse(rawIds);
  return getDatabase().$transaction(async (tx) => {
    const items = await tx.serviceStation.findMany({
      where: { AND: [stationWhere(actor, query), ...(ids.length ? [{ id: { in: ids } }] : [])] },
      select: { name: true, code: true, operationalStatus: true, address: true, province: true,
        locality: true, responsible: true, phone: true, email: true, active: true,
        legalEntity: { select: { legalName: true } } },
      orderBy: [{ [query.sort]: query.order }, { id: "asc" }], take: 5001,
    });
    if (items.length > 5000) throw new DomainError("EXPORT_LIMIT", "La exportación supera 5000 estaciones. Acotá los filtros.", 422);
    if (ids.length && items.length !== new Set(ids).size) {
      throw new DomainError("EXPORT_SCOPE", "Hay estaciones seleccionadas fuera del filtro o del alcance permitido.", 404);
    }
    await tx.auditLog.create({ data: { actorId: actor.id, action: "EXPORT_CSV", resourceType: "station-export",
      resourceId: randomUUID(), changes: { filters: query, selectedIds: ids, count: items.length } } });
    return csvDocument([
      ["Estación", "Código", "Razón social", "Estado operativo", "Domicilio", "Provincia", "Localidad", "Responsable", "Teléfono", "Email", "Estado del registro"],
      ...items.map((item) => [item.name, item.code, item.legalEntity.legalName, operationalStatusLabels[item.operationalStatus],
        item.address, item.province, item.locality, item.responsible, item.phone, item.email, item.active ? "Activa" : "Inactiva"]),
    ]);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
