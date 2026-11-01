import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { childEntityScope, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { assignDocumentSchema } from "./document.schemas";

/** Assignment pins a revision; future catalog changes never rewrite existing obligations. */
export async function assignDocumentRequirement(actor: Actor, input: unknown) {
  requirePermission(actor, "documents:assign");
  const data = assignDocumentSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const entity = await tx.documentableEntity.findFirst({ where: { id: data.entityId, ...childEntityScope(actor) },
      select: { id: true, kind: true, company: { select: { active: true } }, station: { select: { active: true } }, store: { select: { active: true } }, vehicle: { select: { active: true } } },
    });
    if (!entity) throw new DomainError("NOT_FOUND", "Entidad no encontrada o sin acceso.", 404);
    // A write lock conflicts with the cascading scope update during transfers.
    await tx.$queryRaw`SELECT id FROM documentable_entities WHERE id = ${entity.id}::uuid FOR UPDATE`;
    if (!entity.company.active || entity.station?.active === false || entity.store?.active === false || entity.vehicle?.active === false) {
      throw new DomainError("INACTIVE_ENTITY", "Activá la entidad y su razón social antes de asignar obligaciones.", 409);
    }
    const type = await tx.documentType.findUnique({ where: { id: data.documentTypeId }, select: {
      active: true, version: true, revisions: { select: { id: true, appliesTo: true }, orderBy: { number: "desc" }, take: 1 },
    } });
    if (!type?.active) throw new DomainError("INACTIVE_TYPE", "El tipo documental no existe o está inactivo.", 409);
    if (type.version !== data.typeVersion) throw new DomainError("CONFLICT", "La configuración cambió. Actualizá antes de asignar.", 409);
    const revision = type.revisions[0];
    if (!revision?.appliesTo.includes(entity.kind)) throw new DomainError("NOT_APPLICABLE", "El tipo documental no aplica a esta entidad.", 422);
    const requirement = await tx.documentRequirement.create({ data: { entityId: entity.id, documentTypeId: data.documentTypeId, revisionId: revision.id }, select: { id: true, entityId: true, revisionId: true } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "ASSIGN", resourceType: "document-requirement", resourceId: requirement.id, changes: { ...requirement, documentTypeId: data.documentTypeId } } });
    return requirement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
