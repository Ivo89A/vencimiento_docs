import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { childEntityScope, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { presentationQuerySchema } from "./document-presentation.schemas";

export const presentationSummarySelect = {
  id: true, requirementId: true, revisionId: true, number: true, version: true, status: true,
  issuedOn: true, expiresOn: true, createdAt: true, updatedAt: true,
} satisfies Prisma.DocumentPresentationSelect;

export function presentationDates<T extends { issuedOn: Date | null; expiresOn: Date | null }>(item: T) {
  return { ...item, issuedOn: item.issuedOn?.toISOString().slice(0, 10) ?? null, expiresOn: item.expiresOn?.toISOString().slice(0, 10) ?? null };
}

export async function listDocumentPresentations(actor: Actor, rawRequirementId: string, input: unknown) {
  requirePermission(actor, "documents:read");
  const requirementId = z.uuid().parse(rawRequirementId);
  const query = presentationQuerySchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const requirement = await tx.documentRequirement.findFirst({
      where: { id: requirementId, entity: childEntityScope(actor) },
      select: { id: true, entityId: true, version: true, documentType: { select: { active: true } },
        revision: { select: { id: true, name: true, expires: true, fields: true } } },
    });
    if (!requirement) throw new DomainError("NOT_FOUND", "Obligación no encontrada o sin acceso.", 404);
    const where: Prisma.DocumentPresentationWhereInput = { requirementId, requirement: { entity: childEntityScope(actor) } };
    const items = await tx.documentPresentation.findMany({ where, select: presentationSummarySelect,
      orderBy: [{ number: "desc" }, { id: "asc" }], take: 20, skip: (query.page - 1) * 20 });
    const total = await tx.documentPresentation.count({ where });
    return { requirement, items: items.map(presentationDates), total, page: query.page };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

export async function getDocumentPresentation(actor: Actor, rawId: string) {
  requirePermission(actor, "documents:read");
  const id = z.uuid().parse(rawId);
  const item = await getDatabase().documentPresentation.findFirst({
    where: { id, requirement: { entity: childEntityScope(actor) } },
    select: { ...presentationSummarySelect, values: true, notes: true,
      requirement: { select: { entityId: true, documentType: { select: { active: true } } } },
      revision: { select: { name: true, expires: true, fields: true } } },
  });
  if (!item) throw new DomainError("NOT_FOUND", "Presentación no encontrada o sin acceso.", 404);
  return presentationDates(item);
}
