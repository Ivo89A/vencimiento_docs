import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { childEntityScope, requireLegalEntityAccess, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { stationActiveSchema, stationIdSchema, stationSchema, updateStationSchema } from "./station.schemas";
import { stationDetailSelect } from "./station.queries";
import type { StationDetail } from "./station.types";

function snapshot(station: StationDetail) {
  const { id, name, code, legalEntityId, operationalStatus, address, province, locality,
    responsible, phone, email, active, version } = station;
  return { id, name, code, legalEntityId, operationalStatus, address, province, locality,
    responsible, phone, email, active, version };
}

async function requireParent(tx: Prisma.TransactionClient, legalEntityId: string, mustBeActive: boolean) {
  const company = await tx.legalEntity.findUnique({ where: { id: legalEntityId }, select: { active: true } });
  if (!company) throw new DomainError("NOT_FOUND", "Razón social no encontrada o sin acceso.", 404);
  if (mustBeActive && !company.active) {
    throw new DomainError("INACTIVE_PARENT", "La razón social está inactiva. Activala antes de asociar o activar la estación.", 409);
  }
}

/** Serializable matches parent deactivation: no active child may be created under an inactive company. */
export async function createStation(actor: Actor, input: unknown) {
  requirePermission(actor, "stations:write");
  const data = stationSchema.parse(input);
  requireLegalEntityAccess(actor, data.legalEntityId);
  return getDatabase().$transaction(async (tx) => {
    await requireParent(tx, data.legalEntityId, true);
    const station = await tx.serviceStation.create({ data, select: stationDetailSelect });
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: "CREATE", resourceType: "station", resourceId: station.id,
      changes: { after: snapshot(station) },
    } });
    return station;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function updateStation(actor: Actor, rawId: string, input: unknown) {
  requirePermission(actor, "stations:write");
  const id = stationIdSchema.parse(rawId);
  const { version, ...data } = updateStationSchema.parse(input);
  requireLegalEntityAccess(actor, data.legalEntityId);
  return getDatabase().$transaction(async (tx) => {
    const before = await tx.serviceStation.findFirst({ where: { id, ...childEntityScope(actor) }, select: stationDetailSelect });
    if (!before) throw new DomainError("NOT_FOUND", "Estación no encontrada o sin acceso.", 404);
    if (before.version !== version) throw new DomainError("CONFLICT", "La estación cambió. Actualizá la página antes de guardar.", 409);
    const transferring = before.legalEntityId !== data.legalEntityId;
    if (transferring && await tx.documentRequirement.findFirst({ where: { entity: { stationId: id } }, select: { id: true } })) {
      throw new DomainError("DOCUMENTARY_DEPENDENCIES", "No se puede transferir una estación con obligaciones documentales. Debe conservarse su alcance histórico.", 409);
    }
    if (transferring && await tx.store.count({ where: { stationId: id } }) > 0) {
      throw new DomainError("RELATED_STORES", "No se puede cambiar la razón social mientras existan tiendas asociadas, incluso inactivas.", 409);
    }
    await requireParent(tx, data.legalEntityId, before.active || transferring);
    const changed = await tx.serviceStation.updateMany({ where: { id, version }, data: { ...data, version: { increment: 1 } } });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "La estación cambió. Actualizá la página antes de guardar.", 409);
    const station = await tx.serviceStation.findUniqueOrThrow({ where: { id }, select: stationDetailSelect });
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: transferring ? "TRANSFER" : "UPDATE", resourceType: "station", resourceId: id,
      changes: { before: snapshot(before), after: snapshot(station) },
    } });
    return station;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function changeStationActive(actor: Actor, rawId: string, input: unknown) {
  requirePermission(actor, "stations:write");
  const id = stationIdSchema.parse(rawId);
  const { active, version } = stationActiveSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const before = await tx.serviceStation.findFirst({
      where: { id, ...childEntityScope(actor) }, select: { id: true, active: true, version: true, legalEntityId: true },
    });
    if (!before) throw new DomainError("NOT_FOUND", "Estación no encontrada o sin acceso.", 404);
    if (before.version !== version) throw new DomainError("CONFLICT", "La estación cambió. Actualizá la página antes de continuar.", 409);
    if (before.active === active) return before;
    if (active) await requireParent(tx, before.legalEntityId, true);
    if (!active && await tx.store.count({ where: { stationId: id, active: true } }) > 0) {
      throw new DomainError("ACTIVE_DEPENDENCIES", "Primero desactivá o desvinculá las tiendas activas de esta estación.", 409);
    }
    await tx.serviceStation.update({ where: { id, version }, data: { active, version: { increment: 1 } } });
    await tx.auditLog.create({ data: {
      actorId: actor.id, action: active ? "ACTIVATE" : "DEACTIVATE", resourceType: "station", resourceId: id,
      changes: { before: { active: before.active }, after: { active } },
    } });
    return { id, active, version: version + 1, legalEntityId: before.legalEntityId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
