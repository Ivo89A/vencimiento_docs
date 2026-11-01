import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { childEntityScope, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { z } from "zod";
import { documentQuerySchema } from "./document.schemas";

export const documentRevisionSelect = {
  id: true, number: true, name: true, description: true, category: true, appliesTo: true,
  required: true, criticality: true, requiresApproval: true, expires: true, warningDays: true,
  alertDays: true, fields: true,
} satisfies Prisma.DocumentTypeRevisionSelect;
export const documentTypeSelect = {
  id: true, code: true, active: true, version: true,
  revisions: { select: documentRevisionSelect, orderBy: { number: "desc" }, take: 1 },
} satisfies Prisma.DocumentTypeSelect;

export async function listDocumentTypes(actor: Actor, input: unknown) {
  requirePermission(actor, "documents:read");
  const query = documentQuerySchema.parse(input);
  if (query.entityId) await getDocumentableEntity(actor, query.entityId);
  const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
  // Search the same revision displayed by the catalog, not any historical name.
  const filter = query.q ? Prisma.sql`WHERE t.code ILIKE ${pattern} OR (
    SELECT r.name FROM document_type_revisions r WHERE r."documentTypeId" = t.id
    ORDER BY r.number DESC LIMIT 1
  ) ILIKE ${pattern}` : Prisma.empty;
  return getDatabase().$transaction(async (tx) => {
    const page = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT t.id FROM document_types t ${filter}
      ORDER BY t.code ASC, t.id ASC LIMIT 20 OFFSET ${(query.page - 1) * 20}`);
    const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT count(*) AS total FROM document_types t ${filter}`);
    const ids = page.map((item) => item.id);
    const items = await tx.documentType.findMany({ where: { id: { in: ids } }, select: documentTypeSelect, orderBy: [{ code: "asc" }, { id: "asc" }] });
    const assignments = query.entityId ? await tx.documentRequirement.findMany({
      where: { entityId: query.entityId, entity: childEntityScope(actor), documentTypeId: { in: ids } },
      select: { id: true, documentTypeId: true }, take: 20,
    }) : [];
    const assignedIds = new Map(assignments.map((item) => [item.documentTypeId, item.id]));
    return { items: items.map((item) => ({ ...item, assignedRequirementId: assignedIds.get(item.id) ?? null })), total: Number(count.total), page: query.page };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function getDocumentableEntity(actor: Actor, rawId: string) {
  requirePermission(actor, "documents:read");
  const id = z.uuid().parse(rawId);
  const entity = await getDatabase().documentableEntity.findFirst({
    where: { id, ...childEntityScope(actor) },
    select: { id: true, kind: true, legalEntityId: true,
      company: { select: { legalName: true, active: true } },
      station: { select: { name: true, active: true } }, store: { select: { name: true, active: true } },
      vehicle: { select: { plate: true, active: true } },
    },
  });
  if (!entity) throw new DomainError("NOT_FOUND", "Entidad no encontrada o sin acceso.", 404);
  return { id: entity.id, kind: entity.kind, legalEntityId: entity.legalEntityId,
    name: entity.station?.name ?? entity.store?.name ?? entity.vehicle?.plate ?? entity.company.legalName,
    active: entity.company.active && (entity.station?.active ?? entity.store?.active ?? entity.vehicle?.active ?? true),
  };
}

export async function getStationDocumentableId(actor: Actor, stationId: string) {
  requirePermission(actor, "documents:read");
  const entity = await getDatabase().documentableEntity.findFirst({
    where: { stationId: z.uuid().parse(stationId), ...childEntityScope(actor) }, select: { id: true },
  });
  if (!entity) throw new DomainError("NOT_FOUND", "Estación no encontrada o sin acceso.", 404);
  return entity.id;
}

export async function listDocumentRequirements(actor: Actor, input: unknown) {
  requirePermission(actor, "documents:read");
  const query = documentQuerySchema.parse(input);
  const where: Prisma.DocumentRequirementWhereInput = {
    entity: childEntityScope(actor),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.requirementId ? { id: query.requirementId } : {}),
    ...(query.q ? { revision: { name: { contains: query.q, mode: "insensitive" } } } : {}),
  };
  const [items, total] = await getDatabase().$transaction([
    getDatabase().documentRequirement.findMany({ where,
      select: { id: true, entityId: true, createdAt: true, revision: { select: {
        id: true, number: true, name: true, required: true, criticality: true, warningDays: true, expires: true,
      } },
        documentType: { select: { code: true, active: true } },
        entity: { select: { kind: true, company: { select: { tradeName: true } },
          station: { select: { name: true } }, store: { select: { name: true } }, vehicle: { select: { plate: true } } } },
      }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 20, skip: (query.page - 1) * 20,
    }),
    getDatabase().documentRequirement.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return { items, total, page: query.page };
}
