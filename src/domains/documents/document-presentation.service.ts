import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDatabase } from "@/infrastructure/database/client";
import { childEntityScope, requirePermission, type Actor } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { changePresentationSchema, createPresentationSchema, validatePresentationContent } from "./document-presentation.schemas";
import { presentationDates, presentationSummarySelect } from "./document-presentation.queries";

const conflict = () => new DomainError("CONFLICT", "Los datos cambiaron. Actualizá antes de continuar.", 409);
const notFound = () => new DomainError("NOT_FOUND", "Obligación o presentación no encontrada o sin acceso.", 404);
const asDate = (value: string | null) => value ? new Date(`${value}T00:00:00.000Z`) : null;

function fingerprint(content: { issuedOn: string | null; expiresOn: string | null; values: Record<string, unknown>; notes: string }) {
  return createHash("sha256").update(JSON.stringify({ ...content,
    values: Object.fromEntries(Object.entries(content.values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
  })).digest("hex");
}

async function requireActiveRequirement(tx: Prisma.TransactionClient, actor: Actor, id: string) {
  const requirement = await tx.documentRequirement.findFirst({ where: { id, entity: childEntityScope(actor) }, select: {
    id: true, documentTypeId: true, revisionId: true, version: true,
    revision: { select: { expires: true, fields: true } },
    documentType: { select: { active: true } },
    entity: { select: { company: { select: { active: true } }, station: { select: { active: true } },
      store: { select: { active: true } }, vehicle: { select: { active: true } } } },
  } });
  if (!requirement) throw notFound();
  const entity = requirement.entity;
  if (!entity.company.active || entity.station?.active === false || entity.store?.active === false || entity.vehicle?.active === false) {
    throw new DomainError("INACTIVE_ENTITY", "Activá la entidad y su razón social antes de preparar presentaciones.", 409);
  }
  if (!requirement.documentType.active) throw new DomainError("INACTIVE_TYPE", "El tipo documental está inactivo.", 409);
  return requirement;
}

/** Draft metadata only. No evidence/compliance is created and no external effect occurs in SQL. */
export async function createDocumentPresentation(actor: Actor, rawRequirementId: string, input: unknown) {
  requirePermission(actor, "documents:present");
  const requirementId = z.uuid().parse(rawRequirementId);
  const data = createPresentationSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const requirement = await requireActiveRequirement(tx, actor, requirementId);
    const content = validatePresentationContent(requirement.revision, {
      issuedOn: data.issuedOn, expiresOn: data.expiresOn, values: data.values, notes: data.notes,
    });
    const requestFingerprint = fingerprint(content);
    const previous = await tx.documentPresentation.findUnique({
      where: { requirementId_createdById_requestId: { requirementId, createdById: actor.id, requestId: data.requestId } },
      select: { ...presentationSummarySelect, requestFingerprint: true },
    });
    if (previous) {
      if (previous.requestFingerprint !== requestFingerprint) throw new DomainError("IDEMPOTENCY_CONFLICT", "La solicitud ya fue usada con otros datos.", 409);
      // Never expose the internal fingerprint in DTOs, including idempotent replays.
      const { requestFingerprint: _internal, ...summary } = previous;
      void _internal;
      return presentationDates(summary);
    }
    if (requirement.version !== data.requirementVersion) throw conflict();
    const updated = await tx.documentRequirement.updateMany({ where: { id: requirementId, version: data.requirementVersion }, data: { version: { increment: 1 } } });
    if (updated.count !== 1) throw conflict();
    const latest = await tx.documentPresentation.findFirst({ where: { requirementId }, select: { number: true }, orderBy: { number: "desc" } });
    const presentation = await tx.documentPresentation.create({ data: {
      requirementId, documentTypeId: requirement.documentTypeId, revisionId: requirement.revisionId,
      number: (latest?.number ?? 0) + 1, issuedOn: asDate(content.issuedOn), expiresOn: asDate(content.expiresOn),
      values: content.values as Prisma.InputJsonObject, notes: content.notes,
      createdById: actor.id, requestId: data.requestId, requestFingerprint,
    }, select: presentationSummarySelect });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "CREATE_DRAFT", resourceType: "document-presentation",
      resourceId: presentation.id, changes: { requirementId, revisionId: requirement.revisionId, number: presentation.number, status: "DRAFT" } } });
    return presentationDates(presentation);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function changeDocumentPresentation(actor: Actor, rawId: string, input: unknown) {
  requirePermission(actor, "documents:present");
  const id = z.uuid().parse(rawId);
  const data = changePresentationSchema.parse(input);
  return getDatabase().$transaction(async (tx) => {
    const previous = await tx.documentPresentation.findFirst({ where: { id, requirement: { entity: childEntityScope(actor) } },
      select: { ...presentationSummarySelect, revision: { select: { expires: true, fields: true } } } });
    if (!previous) throw notFound();
    if (previous.version !== data.version) throw conflict();
    if (previous.status !== "DRAFT") throw new DomainError("PRESENTATION_CLOSED", "La presentación cancelada conserva su historial y no se puede modificar.", 409);
    // Cancellation remains available on inactive entities/types; editing does not.
    let update: Prisma.DocumentPresentationUpdateManyMutationInput;
    if (data.action === "CANCEL") update = { status: "CANCELLED", version: { increment: 1 } };
    else {
      await requireActiveRequirement(tx, actor, previous.requirementId);
      const content = validatePresentationContent(previous.revision, {
        issuedOn: data.issuedOn, expiresOn: data.expiresOn, values: data.values, notes: data.notes,
      });
      update = { issuedOn: asDate(content.issuedOn), expiresOn: asDate(content.expiresOn),
        values: content.values as Prisma.InputJsonObject, notes: content.notes, version: { increment: 1 } };
    }
    const updated = await tx.documentPresentation.updateMany({ where: { id, version: data.version, status: "DRAFT" }, data: update });
    if (updated.count !== 1) throw conflict();
    await tx.auditLog.create({ data: { actorId: actor.id, action: data.action === "CANCEL" ? "CANCEL_DRAFT" : "UPDATE_DRAFT",
      resourceType: "document-presentation", resourceId: id,
      changes: { requirementId: previous.requirementId, previousVersion: data.version, version: data.version + 1 } } });
    const presentation = await tx.documentPresentation.findUniqueOrThrow({ where: { id }, select: presentationSummarySelect });
    return presentationDates(presentation);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
