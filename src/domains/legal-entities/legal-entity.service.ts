import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { DomainError } from "@/lib/errors";
import { csvDocument } from "@/lib/csv";
import { z } from "zod";
import { legalEntityScope, requireLegalEntityAccess, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { changeActiveSchema, idSchema, legalEntityQuerySchema, legalEntitySchema, updateLegalEntitySchema } from "./legal-entity.schemas";

const legalEntitySelect = {
  id: true, legalName: true, tradeName: true, cuit: true, address: true,
  province: true, locality: true, email: true, phone: true, responsible: true,
  active: true, version: true, createdAt: true, updatedAt: true,
} satisfies Prisma.LegalEntitySelect;

function legalEntityWhere(actor: Actor, query: z.infer<typeof legalEntityQuerySchema>): Prisma.LegalEntityWhereInput {
  return {
    ...legalEntityScope(actor),
    ...(query.active === "all" ? {} : { active: query.active === "true" }),
    ...(query.q ? { OR: [
      { legalName: { contains: query.q, mode: "insensitive" } },
      { tradeName: { contains: query.q, mode: "insensitive" } },
      { cuit: { contains: query.q.replace(/[-\s]/g, "") || query.q } },
    ] } : {}),
  };
}

export async function listLegalEntities(actor: Actor, input: unknown) {
  requirePermission(actor, "legal-entities:read");
  const query = legalEntityQuerySchema.parse(input);
  const where = legalEntityWhere(actor, query);
  const [items, total] = await getDatabase().$transaction([
    getDatabase().legalEntity.findMany({ where, select: legalEntitySelect,
      skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
    }),
    getDatabase().legalEntity.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function exportLegalEntitiesCsv(actor: Actor, input: unknown, rawIds: unknown) {
  requirePermission(actor, "legal-entities:read");
  requirePermission(actor, "legal-entities:export");
  const query = legalEntityQuerySchema.parse(input);
  const ids = z.array(idSchema).max(100, "Seleccioná hasta 100 registros.").parse(rawIds);
  return getDatabase().$transaction(async (tx) => {
    const where = { AND: [legalEntityWhere(actor, query), ...(ids.length ? [{ id: { in: ids } }] : [])] };
    const items = await tx.legalEntity.findMany({ where, select: legalEntitySelect, take: 5001, orderBy: [{ [query.sort]: query.order }, { id: "asc" }] });
    if (items.length > 5000) throw new DomainError("EXPORT_LIMIT", "La exportación supera 5000 registros. Acotá los filtros.", 422);
    if (ids.length && items.length !== new Set(ids).size) throw new DomainError("EXPORT_SCOPE", "Hay registros seleccionados fuera del filtro o del alcance permitido. Actualizá el listado.", 404);
    await tx.auditLog.create({ data: { actorId: actor.id, action: "EXPORT_CSV", resourceType: "legal-entity-export", resourceId: crypto.randomUUID(), changes: { filters: query, selectedIds: ids, count: items.length } } });
    return csvDocument([
      ["Nombre legal", "Nombre comercial", "CUIT", "Domicilio", "Provincia", "Localidad", "Email", "Teléfono", "Responsable", "Estado"],
      ...items.map((item) => [item.legalName, item.tradeName, item.cuit, item.address, item.province, item.locality, item.email, item.phone, item.responsible, item.active ? "Activa" : "Inactiva"]),
    ]);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function getLegalEntity(actor: Actor, rawId: string) {
  requirePermission(actor, "legal-entities:read");
  const id = idSchema.parse(rawId);
  requireLegalEntityAccess(actor, id);
  const item = await getDatabase().legalEntity.findUnique({ where: { id }, select: legalEntitySelect });
  if (!item) throw new DomainError("NOT_FOUND", "Razón social no encontrada o sin acceso.", 404);
  return item;
}

export async function createLegalEntity(actor: Actor, input: unknown) {
  requirePermission(actor, "legal-entities:write");
  if (!actor.allEntities) throw new DomainError("FORBIDDEN", "Crear razones sociales requiere alcance global.", 403);
  const data = legalEntitySchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const item = await tx.legalEntity.create({ data, select: legalEntitySelect });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "CREATE", resourceType: "legal-entity", resourceId: item.id, changes: { after: data } } });
    return item;
  });
}

export async function updateLegalEntity(actor: Actor, rawId: string, input: unknown) {
  requirePermission(actor, "legal-entities:write");
  const id = idSchema.parse(rawId);
  requireLegalEntityAccess(actor, id);
  const { version, ...data } = updateLegalEntitySchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const before = await tx.legalEntity.findUnique({ where: { id }, select: legalEntitySelect });
    if (!before) throw new DomainError("NOT_FOUND", "Razón social no encontrada o sin acceso.", 404);
    const changed = await tx.legalEntity.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "El registro cambió. Actualizá la página antes de guardar.", 409);
    const { createdAt: _created, updatedAt: _updated, ...previous } = before;
    void _created; void _updated;
    await tx.auditLog.create({ data: { actorId: actor.id, action: "UPDATE", resourceType: "legal-entity", resourceId: id, changes: { before: previous, after: data } } });
    return tx.legalEntity.findUniqueOrThrow({ where: { id }, select: legalEntitySelect });
  });
}

export async function changeLegalEntityActive(actor: Actor, rawId: string, input: unknown) {
  requirePermission(actor, "legal-entities:write");
  const id = idSchema.parse(rawId);
  requireLegalEntityAccess(actor, id);
  const { active, version } = changeActiveSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const before = await tx.legalEntity.findUnique({ where: { id }, select: { active: true, version: true } });
    if (!before) throw new DomainError("NOT_FOUND", "Razón social no encontrada o sin acceso.", 404);
    if (before.version !== version) throw new DomainError("CONFLICT", "El registro cambió. Actualizá la página.", 409);
    if (before.active === active) return { id, active, version };
    if (!active) {
      const counts = await Promise.all([
        tx.serviceStation.count({ where: { legalEntityId: id, active: true } }),
        tx.store.count({ where: { legalEntityId: id, active: true } }),
        tx.vehicle.count({ where: { legalEntityId: id, active: true } }),
      ]);
      if (counts.some((count) => count > 0)) throw new DomainError("ACTIVE_DEPENDENCIES", "Primero desactivá las estaciones, tiendas y rodados activos de esta razón social.", 409);
    }
    await tx.legalEntity.update({ where: { id, version }, data: { active, version: { increment: 1 } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: active ? "ACTIVATE" : "DEACTIVATE", resourceType: "legal-entity", resourceId: id, changes: { before: { active: before.active }, after: { active } } } });
    return { id, active, version: version + 1 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listLegalEntityHistory(actor: Actor, rawId: string, rawPage: unknown = 1) {
  await getLegalEntity(actor, rawId);
  requirePermission(actor, "audit:read");
  const { page } = legalEntityQuerySchema.parse({ page: rawPage });
  return getDatabase().auditLog.findMany({
    where: { resourceType: "legal-entity", resourceId: rawId },
    select: { id: true, action: true, createdAt: true, actor: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20,
  });
}
