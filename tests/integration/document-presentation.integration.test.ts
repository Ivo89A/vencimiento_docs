import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase } from "@/infrastructure/database/client";
import { permissions, type Actor } from "@/domains/auth/access-policy";
import { createDocumentType, reviseDocumentType } from "@/domains/documents/document-type.service";
import { assignDocumentRequirement } from "@/domains/documents/document-requirement.service";
import { createDocumentPresentation, changeDocumentPresentation } from "@/domains/documents/document-presentation.service";
import { getDocumentPresentation, listDocumentPresentations } from "@/domains/documents/document-presentation.queries";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname) || url === process.env.DATABASE_URL) throw new Error("Se requiere TEST_DATABASE_URL aislada y diferente de DATABASE_URL.");
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= randomUUID() + randomUUID();
const actorId = randomUUID();
const companyId = randomUUID();
const admin: Actor = { id: actorId, name: "QA presentaciones", email: `${actorId}@example.invalid`, allEntities: true, permissions, legalEntityIds: [] };
const viewer: Actor = { ...admin, allEntities: false, legalEntityIds: [companyId], permissions: ["documents:read"] };
const configuration = { name: "Bomberos QA", description: "QA", category: "Seguridad", appliesTo: ["LEGAL_ENTITY"],
  required: true, criticality: "HIGH", requiresApproval: true, expires: true, warningDays: 30, alertDays: [30, 0],
  fields: [{ key: "numero", label: "Número", type: "TEXT", required: true }] };
const body = () => ({ requirementVersion: 1, requestId: randomUUID(), issuedOn: "2026-11-04", expiresOn: "2027-11-04", values: { numero: "B-123" }, notes: "Dato reservado de prueba" });
async function obligation() {
  const type = await createDocumentType(admin, { ...configuration, code: `QA-${randomUUID()}` });
  const entity = await getDatabase().documentableEntity.findUniqueOrThrow({ where: { companyId }, select: { id: true } });
  const requirement = await assignDocumentRequirement(admin, { entityId: entity.id, documentTypeId: type.id, typeVersion: 1 });
  return { requirement, type };
}

describe("Presentaciones en borrador: PostgreSQL, permisos, historia y concurrencia", () => {
  beforeAll(async () => {
    const db = getDatabase();
    await db.user.create({ data: { id: actorId, name: admin.name, email: admin.email } });
    await db.legalEntity.create({ data: { id: companyId, legalName: "QA presentaciones", tradeName: "QA", cuit: "30970000009",
      address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "" } });
  });

  it("guarda fecha civil y campos tipados sin convertir un borrador en cumplimiento", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    expect(draft).toMatchObject({ number: 1, status: "DRAFT", issuedOn: "2026-11-04", expiresOn: "2027-11-04" });
    expect(draft).not.toHaveProperty("requestFingerprint");
    const detail = await getDocumentPresentation(viewer, draft.id);
    expect(detail.values).toEqual({ numero: "B-123" });
    expect((await listDocumentPresentations(viewer, requirement.id, {})).requirement.version).toBe(2);
    const audit = await getDatabase().auditLog.findFirstOrThrow({ where: { resourceId: draft.id } });
    expect(JSON.stringify(audit.changes)).not.toContain("Dato reservado");
    expect(JSON.stringify(audit.changes)).not.toContain("B-123");
  });

  it("un reintento con el mismo requestId no duplica versión ni auditoría", async () => {
    const { requirement } = await obligation();
    const data = body();
    const first = await createDocumentPresentation(admin, requirement.id, data);
    expect((await createDocumentPresentation(admin, requirement.id, data)).id).toBe(first.id);
    expect(await getDatabase().documentPresentation.count({ where: { requirementId: requirement.id } })).toBe(1);
    expect(await getDatabase().auditLog.count({ where: { resourceId: first.id } })).toBe(1);
    await expect(createDocumentPresentation(admin, requirement.id, { ...data, notes: "Otra solicitud" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("conserva configuración histórica aunque el catálogo reciba una revisión nueva", async () => {
    const { requirement, type } = await obligation();
    await reviseDocumentType(admin, type.id, { ...configuration, fields: [{ key: "nuevo", label: "Nuevo", type: "NUMBER", required: true }], version: 1 });
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    expect(draft.revisionId).toBe(requirement.revisionId);
    const latestRevision = await getDatabase().documentTypeRevision.findFirstOrThrow({ where: { documentTypeId: type.id }, orderBy: { number: "desc" }, select: { id: true } });
    await expect(getDatabase().documentPresentation.create({ data: { requirementId: requirement.id, documentTypeId: type.id,
      revisionId: latestRevision.id, number: 2, values: {}, createdById: actorId, requestId: randomUUID(), requestFingerprint: "0".repeat(64) } })).rejects.toThrow();
    await expect(createDocumentPresentation(admin, requirement.id, { ...body(), requirementVersion: 2, values: { nuevo: 10 } })).rejects.toThrow();
  });

  it("deniega escritura al visualizador y oculta listado, conteo y detalle de otro alcance", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    await expect(createDocumentPresentation(viewer, requirement.id, body())).rejects.toMatchObject({ status: 403 });
    await expect(changeDocumentPresentation(viewer, draft.id, { action: "CANCEL", version: 1 })).rejects.toMatchObject({ status: 403 });
    const foreign = { ...admin, allEntities: false, legalEntityIds: [] };
    await expect(listDocumentPresentations(foreign, requirement.id, {})).rejects.toMatchObject({ status: 404 });
    await expect(getDocumentPresentation(foreign, draft.id)).rejects.toMatchObject({ status: 404 });
    await expect(createDocumentPresentation(foreign, requirement.id, body())).rejects.toMatchObject({ status: 404 });
    await expect(changeDocumentPresentation(foreign, draft.id, { action: "CANCEL", version: 1 })).rejects.toMatchObject({ status: 404 });
  });

  it("dos altas concurrentes no duplican números ni aceptan una versión obsoleta", async () => {
    const { requirement } = await obligation();
    const results = await Promise.allSettled([body(), body()].map((data) => createDocumentPresentation(admin, requirement.id, data)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(createDocumentPresentation(admin, requirement.id, body())).rejects.toMatchObject({ status: 409 });
    expect((await createDocumentPresentation(admin, requirement.id, { ...body(), requirementVersion: 2 })).number).toBe(2);
  });

  it("edita con versión esperada y cancela conservando los datos; el cierre es irreversible", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    const { requirementVersion: _version, requestId: _requestId, ...content } = body();
    void _version; void _requestId;
    expect((await changeDocumentPresentation(admin, draft.id, { ...content, notes: "Corrección", action: "UPDATE", version: 1 })).version).toBe(2);
    await expect(changeDocumentPresentation(admin, draft.id, { action: "CANCEL", version: 1 })).rejects.toMatchObject({ status: 409 });
    expect((await changeDocumentPresentation(admin, draft.id, { action: "CANCEL", version: 2 })).status).toBe("CANCELLED");
    expect((await getDocumentPresentation(admin, draft.id)).notes).toBe("Corrección");
    await expect(changeDocumentPresentation(admin, draft.id, { ...content, action: "UPDATE", version: 3 })).rejects.toMatchObject({ code: "PRESENTATION_CLOSED" });
  });

  it("dos cancelaciones concurrentes no duplican la transición ni incrementan dos veces la versión", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    const results = await Promise.allSettled([1, 2].map(() => changeDocumentPresentation(admin, draft.id, { action: "CANCEL", version: 1 })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await getDocumentPresentation(admin, draft.id)).version).toBe(2);
  });

  it("falla atómicamente si no puede registrar la auditoría de una modificación", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    await expect(changeDocumentPresentation({ ...admin, id: "actor-inexistente" }, draft.id, { action: "CANCEL", version: 1 })).rejects.toThrow();
    expect((await getDocumentPresentation(admin, draft.id))).toMatchObject({ status: "DRAFT", version: 1 });
  });

  it("SQL impide cambiar identidad, revisión, saltar versiones o borrar evidencia histórica", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    const db = getDatabase();
    await expect(db.documentPresentation.update({ where: { id: draft.id }, data: { notes: "sin versión" } })).rejects.toThrow();
    await expect(db.documentPresentation.update({ where: { id: draft.id }, data: { number: 99, version: { increment: 1 } } })).rejects.toThrow();
    await expect(db.documentPresentation.delete({ where: { id: draft.id } })).rejects.toThrow();
    await expect(db.documentPresentation.update({ where: { id: draft.id }, data: { status: "CANCELLED", notes: "reescribir al cancelar", version: { increment: 1 } } })).rejects.toThrow();
    await expect(db.documentRequirement.delete({ where: { id: requirement.id } })).rejects.toThrow();
    const other = await obligation();
    await expect(db.documentPresentation.create({ data: { requirementId: requirement.id, documentTypeId: other.type.id,
      revisionId: other.requirement.revisionId, number: 2, values: {}, createdById: actorId, requestId: randomUUID(), requestFingerprint: "0".repeat(64) } })).rejects.toThrow();
  });

  it("rechaza datos inválidos sin incrementar la obligación ni crear filas", async () => {
    const { requirement } = await obligation();
    await expect(createDocumentPresentation(admin, requirement.id, { ...body(), values: {} })).rejects.toThrow();
    expect((await getDatabase().documentRequirement.findUniqueOrThrow({ where: { id: requirement.id } })).version).toBe(1);
    expect(await getDatabase().documentPresentation.count({ where: { requirementId: requirement.id } })).toBe(0);
  });

  it("no permite editar canceladas desde SQL ni crear directamente una presentación cerrada", async () => {
    const { requirement } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    await changeDocumentPresentation(admin, draft.id, { action: "CANCEL", version: 1 });
    await expect(getDatabase().documentPresentation.update({ where: { id: draft.id }, data: { status: "DRAFT", version: { increment: 1 } } })).rejects.toThrow();
    const other = await obligation();
    await expect(getDatabase().documentPresentation.create({ data: { requirementId: other.requirement.id, documentTypeId: other.type.id,
      revisionId: other.requirement.revisionId, number: 1, status: "CANCELLED", values: {}, createdById: actorId, requestId: randomUUID(), requestFingerprint: "0".repeat(64) } })).rejects.toThrow();
  });

  it("rechaza nuevas presentaciones y edición en tipos inactivos, pero conserva consulta y cancelación", async () => {
    const { requirement, type } = await obligation();
    const draft = await createDocumentPresentation(admin, requirement.id, body());
    await getDatabase().documentType.update({ where: { id: type.id }, data: { active: false } });
    await expect(createDocumentPresentation(admin, requirement.id, { ...body(), requirementVersion: 2 })).rejects.toMatchObject({ code: "INACTIVE_TYPE" });
    const { requirementVersion: _v, requestId: _r, ...content } = body();
    void _v; void _r;
    await expect(changeDocumentPresentation(admin, draft.id, { ...content, action: "UPDATE", version: 1 })).rejects.toMatchObject({ code: "INACTIVE_TYPE" });
    expect((await changeDocumentPresentation(admin, draft.id, { action: "CANCEL", version: 1 })).status).toBe("CANCELLED");
    expect((await listDocumentPresentations(viewer, requirement.id, {})).total).toBe(1);
  });

  it("pagina 20 filas y no serializa datos del autor, notas o campos en el listado", async () => {
    const { requirement } = await obligation();
    for (let version = 1; version <= 21; version++) await createDocumentPresentation(admin, requirement.id, { ...body(), requirementVersion: version });
    const first = await listDocumentPresentations(viewer, requirement.id, {});
    const second = await listDocumentPresentations(viewer, requirement.id, { page: 2 });
    expect(first.items).toHaveLength(20); expect(first.total).toBe(21);
    expect(second.items).toHaveLength(1);
    expect(first.items[0].number).toBe(21); expect(second.items[0].number).toBe(1);
    for (const key of ["values", "notes", "requestId", "requestFingerprint", "createdById"]) expect(first.items[0]).not.toHaveProperty(key);
  });

  // Immutable fixtures intentionally remain in the disposable QA database; never weaken triggers to clean them.
  afterAll(async () => { await getDatabase().$disconnect(); });
});
