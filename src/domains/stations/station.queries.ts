import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { DomainError } from "@/lib/errors";
import {
  childEntityScope, hasPermission, legalEntityScope,
  requireLegalEntityAccess, requirePermission, type Actor,
} from "@/domains/auth/access-policy";
import { companyOptionQuerySchema, stationIdSchema, stationQuerySchema, type StationQuery } from "./station.schemas";

export const stationListSelect = {
  id: true, name: true, code: true, legalEntityId: true, operationalStatus: true,
  active: true, province: true, locality: true, responsible: true,
  legalEntity: { select: { id: true, legalName: true, tradeName: true, active: true } },
} satisfies Prisma.ServiceStationSelect;

export const stationDetailSelect = {
  ...stationListSelect, address: true, email: true, phone: true,
  version: true, createdAt: true, updatedAt: true,
} satisfies Prisma.ServiceStationSelect;

export function stationWhere(actor: Actor, query: StationQuery): Prisma.ServiceStationWhereInput {
  return {
    AND: [
      childEntityScope(actor),
      ...(query.legalEntityId ? [{ legalEntityId: query.legalEntityId }] : []),
      ...(query.active === "all" ? [] : [{ active: query.active === "true" }]),
      ...(query.operationalStatus ? [{ operationalStatus: query.operationalStatus }] : []),
      ...(query.q ? [{ OR: [
        { name: { contains: query.q, mode: "insensitive" as const } },
        { code: { contains: query.q, mode: "insensitive" as const } },
        { locality: { contains: query.q, mode: "insensitive" as const } },
      ] }] : []),
    ],
  };
}

export async function listStations(actor: Actor, input: unknown) {
  requirePermission(actor, "stations:read");
  const query = stationQuerySchema.parse(input);
  const where = stationWhere(actor, query);
  const db = getDatabase();
  const [items, total] = await db.$transaction([
    db.serviceStation.findMany({
      where, select: stationListSelect, take: query.pageSize, skip: (query.page - 1) * query.pageSize,
      orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
    }),
    db.serviceStation.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getStation(actor: Actor, rawId: string) {
  requirePermission(actor, "stations:read");
  const id = stationIdSchema.parse(rawId);
  const station = await getDatabase().serviceStation.findFirst({
    where: { id, ...childEntityScope(actor) }, select: stationDetailSelect,
  });
  if (!station) throw new DomainError("NOT_FOUND", "Estación no encontrada o sin acceso.", 404);
  return station;
}

export async function listStationHistory(actor: Actor, rawId: string, page: unknown = 1) {
  requirePermission(actor, "audit:read");
  const station = await getStation(actor, rawId);
  const query = stationQuerySchema.parse({ page });
  return getDatabase().auditLog.findMany({
    where: { resourceType: "station", resourceId: station.id },
    select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (query.page - 1) * 20,
  });
}

function requireCompanyOptionPermission(actor: Actor) {
  if (!hasPermission(actor, "stations:read") && !hasPermission(actor, "stations:write")) {
    throw new DomainError("FORBIDDEN", "No tenés permiso para consultar empresas para estaciones.", 403);
  }
}

export async function listStationCompanyOptions(actor: Actor, input: unknown) {
  requireCompanyOptionPermission(actor);
  const query = companyOptionQuerySchema.parse(input);
  const items = await getDatabase().legalEntity.findMany({
    where: {
      ...legalEntityScope(actor), ...(query.active === "true" ? { active: true } : {}),
      ...(query.q ? { OR: [
        { legalName: { contains: query.q, mode: "insensitive" } },
        { tradeName: { contains: query.q, mode: "insensitive" } },
      ] } : {}),
    },
    select: { id: true, legalName: true, tradeName: true, active: true },
    orderBy: [{ legalName: "asc" }, { id: "asc" }], take: 21, skip: (query.page - 1) * 20,
  });
  return {
    items: items.slice(0, 20).map((item) => ({ id: item.id, label: `${item.tradeName} — ${item.legalName}`, active: item.active })),
    hasMore: items.length > 20, page: query.page,
  };
}

export async function getStationCompanyOption(actor: Actor, rawId: string) {
  requireCompanyOptionPermission(actor);
  const id = stationIdSchema.parse(rawId);
  requireLegalEntityAccess(actor, id);
  const item = await getDatabase().legalEntity.findUnique({
    where: { id }, select: { id: true, legalName: true, tradeName: true, active: true },
  });
  if (!item) throw new DomainError("NOT_FOUND", "Razón social no encontrada o sin acceso.", 404);
  return { id: item.id, label: `${item.tradeName} — ${item.legalName}`, active: item.active };
}
