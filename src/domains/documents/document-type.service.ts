import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { createDocumentTypeSchema, reviseDocumentTypeSchema, documentTypeActiveSchema } from "./document.schemas";
import { documentTypeSelect } from "./document.queries";

export function requireDocumentConfiguration(actor: Actor) {
  requirePermission(actor, "documents:configure");
  if (!actor.allEntities) throw new DomainError("FORBIDDEN", "La configuración común requiere alcance global.", 403);
}

export async function getDocumentTypeForConfiguration(actor: Actor, rawId: string) {
  requireDocumentConfiguration(actor);
  const id = z.uuid().parse(rawId);
  const type = await getDatabase().documentType.findUnique({ where: { id }, select: documentTypeSelect });
  if (!type?.revisions[0]) throw new DomainError("NOT_FOUND", "Tipo documental no encontrado.", 404);
  return type;
}

export async function createDocumentType(actor: Actor, input: unknown) {
  requireDocumentConfiguration(actor);
  const { code, ...configuration } = createDocumentTypeSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const type = await tx.documentType.create({ data: { code, revisions: { create: { ...configuration, number: 1 } } }, select: documentTypeSelect });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "CREATE", resourceType: "document-type", resourceId: type.id,
      changes: { code, revisionId: type.revisions[0].id, number: 1 } } });
    return type;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function reviseDocumentType(actor: Actor, rawId: string, input: unknown) {
  requireDocumentConfiguration(actor);
  const id = z.uuid().parse(rawId);
  const { version, ...configuration } = reviseDocumentTypeSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const changed = await tx.documentType.updateMany({ where: { id, version }, data: { version: { increment: 1 } } });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "El tipo cambió o no existe. Actualizá la página.", 409);
    const latest = await tx.documentTypeRevision.findFirstOrThrow({ where: { documentTypeId: id }, select: { number: true }, orderBy: { number: "desc" } });
    const revision = await tx.documentTypeRevision.create({ data: { ...configuration, documentTypeId: id, number: latest.number + 1 }, select: { id: true, number: true } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "REVISE", resourceType: "document-type", resourceId: id, changes: { revisionId: revision.id, number: revision.number } } });
    return tx.documentType.findUniqueOrThrow({ where: { id }, select: documentTypeSelect });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function changeDocumentTypeActive(actor: Actor, rawId: string, input: unknown) {
  requireDocumentConfiguration(actor);
  const id = z.uuid().parse(rawId);
  const { active, version } = documentTypeActiveSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const changed = await tx.documentType.updateMany({ where: { id, version }, data: { active, version: { increment: 1 } } });
    if (changed.count !== 1) throw new DomainError("CONFLICT", "El tipo cambió o no existe. Actualizá la página.", 409);
    await tx.auditLog.create({ data: { actorId: actor.id, action: active ? "ACTIVATE" : "DEACTIVATE", resourceType: "document-type", resourceId: id, changes: { active, version: version + 1 } } });
    return { id, active, version: version + 1 };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
