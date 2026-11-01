import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client as PgClient } from "pg";
import { getDatabase } from "@/infrastructure/database/client";
import { permissions, type Actor } from "@/domains/auth/access-policy";
import { createStation, updateStation, changeStationActive } from "@/domains/stations/station.service";
import { createDocumentType, reviseDocumentType, changeDocumentTypeActive } from "@/domains/documents/document-type.service";
import { assignDocumentRequirement } from "@/domains/documents/document-requirement.service";
import { getDocumentableEntity, getStationDocumentableId, listDocumentRequirements, listDocumentTypes } from "@/domains/documents/document.queries";
import type { DocumentConfiguration } from "@/domains/documents/document.schemas";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname) || url === process.env.DATABASE_URL) throw new Error("Se requiere TEST_DATABASE_URL aislada con nombre test, diferente de DATABASE_URL.");
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= randomUUID() + randomUUID();

const actorId = randomUUID();
const companyA = randomUUID();
const companyB = randomUUID();
const runId = randomUUID();
const stationIds: string[] = [];
const admin: Actor = { id: actorId, name: "QA documentos", email: `${actorId}@example.invalid`, allEntities: true, legalEntityIds: [], permissions: [...permissions] };
const viewer: Actor = { ...admin, allEntities: false, legalEntityIds: [companyA], permissions: ["documents:read"] };
const configuration: DocumentConfiguration = {
  name: `Certificado bomberos ${runId}`, description: "Requisito de prueba", category: "Seguridad",
  appliesTo: ["STATION"], required: true, criticality: "HIGH", requiresApproval: true,
  expires: true, warningDays: 30, alertDays: [60, 30, 15, 7, 0], fields: [{ key: "numero", label: "Número", type: "TEXT", required: true }],
};
const stationData = (company = companyA) => ({ name: `Estación ${runId}`, code: randomUUID(), legalEntityId: company,
  operationalStatus: "OPERATIONAL" as const, address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "" });
async function newStation(company = companyA) {
  const data = stationData(company);
  const station = await createStation(admin, data);
  stationIds.push(station.id);
  return { station, data, entityId: await getStationDocumentableId(admin, station.id) };
}
const newType = (changes: Partial<DocumentConfiguration> = {}) => createDocumentType(admin, { ...configuration, ...changes, code: `QA-${randomUUID()}` });

describe("Motor documental: modelo, permisos y asignación en PostgreSQL", () => {
  beforeAll(async () => {
    const db = getDatabase();
    await db.user.create({ data: { id: actorId, name: admin.name, email: admin.email } });
    for (const [index, id] of [companyA, companyB].entries()) {
      await db.legalEntity.create({ data: { id, legalName: `QA documentos ${index}`, tradeName: "QA documentos", cuit: `3097000000${index}`, address: "QA", province: "QA", locality: "QA", responsible: "QA", email: "", phone: "" } });
    }
  });

  it("registra entidades nuevas incluso con escritura directa del ORM", async () => {
    const { station, entityId } = await newStation();
    expect(await getDocumentableEntity(viewer, entityId)).toMatchObject({ kind: "STATION", name: station.name, legalEntityId: companyA, active: true });
    expect(await getDatabase().documentableEntity.count({ where: { companyId: companyA } })).toBe(1);
  });
  it("rechaza subtipo incorrecto y referencias de otra empresa en SQL", async () => {
    const { station } = await newStation();
    await expect(getDatabase().documentableEntity.create({ data: { kind: "STATION", legalEntityId: companyA, companyId: companyA } })).rejects.toThrow();
    await expect(getDatabase().documentableEntity.create({ data: { kind: "STATION", legalEntityId: companyB, stationId: station.id } })).rejects.toThrow();
  });
  it("el registro no puede borrarse dejando viva a la entidad concreta", async () => {
    const { entityId } = await newStation();
    await expect(getDatabase().documentableEntity.delete({ where: { id: entityId } })).rejects.toThrow();
    expect(await getDatabase().documentableEntity.count({ where: { id: entityId } })).toBe(1);
  });
  it("crea tipo y asigna obligación con auditoría atómica", async () => {
    const type = await newType();
    const { entityId } = await newStation();
    const requirement = await assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: type.version });
    expect(requirement.revisionId).toBe(type.revisions[0].id);
    expect(await getDatabase().auditLog.count({ where: { resourceId: requirement.id, action: "ASSIGN" } })).toBe(1);
    expect((await listDocumentRequirements(viewer, { entityId })).items[0].id).toBe(requirement.id);
  });
  it("una revisión nueva no cambia obligaciones históricas", async () => {
    const type = await newType();
    const first = await newStation();
    await assignDocumentRequirement(admin, { entityId: first.entityId, documentTypeId: type.id, typeVersion: 1 });
    const revised = await reviseDocumentType(admin, type.id, { ...configuration, warningDays: 90, version: 1 });
    expect(revised.revisions[0].number).toBe(2);
    expect((await listDocumentRequirements(admin, { entityId: first.entityId })).items[0].revision.warningDays).toBe(30);
    const second = await newStation();
    await assignDocumentRequirement(admin, { entityId: second.entityId, documentTypeId: type.id, typeVersion: revised.version });
    expect((await listDocumentRequirements(admin, { entityId: second.entityId })).items[0].revision.warningDays).toBe(90);
    await expect(getDatabase().documentTypeRevision.update({ where: { id: type.revisions[0].id }, data: { warningDays: 0 } })).rejects.toThrow();
  });
  it("rechaza revisión obsoleta y duplicados concurrentes", async () => {
    const type = await newType();
    const { entityId } = await newStation();
    await expect(assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 5 })).rejects.toMatchObject({ status: 409 });
    const results = await Promise.allSettled([1, 2].map(() => assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 1 })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getDatabase().documentRequirement.count({ where: { entityId } })).toBe(1);
    expect(await getDatabase().auditLog.count({ where: { resourceType: "document-requirement", changes: { path: ["entityId"], equals: entityId } } })).toBe(1);
  });
  it("deniega escritura al visualizador y oculta obligaciones ajenas antes de contar", async () => {
    const type = await newType();
    const { entityId } = await newStation(companyB);
    await assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 1 });
    expect((await listDocumentRequirements(viewer, { entityId })).total).toBe(0);
    await expect(getDocumentableEntity(viewer, entityId)).rejects.toMatchObject({ status: 404 });
    await expect(assignDocumentRequirement(viewer, { entityId, documentTypeId: type.id, typeVersion: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(assignDocumentRequirement({ ...viewer, permissions: ["documents:assign"] }, { entityId, documentTypeId: type.id, typeVersion: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(createDocumentType(viewer, {})).rejects.toMatchObject({ status: 403 });
  });
  it("no admite configuración global con permisos limitados a empresas", async () => {
    await expect(newType()).resolves.toHaveProperty("id");
    await expect(createDocumentType({ ...viewer, permissions: ["documents:configure"] }, { ...configuration, code: "QA" })).rejects.toMatchObject({ status: 403 });
  });
  it("valida regla de aplicación y protege también el acceso directo SQL", async () => {
    const type = await newType({ appliesTo: ["VEHICLE"] });
    const { entityId } = await newStation();
    await expect(assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 1 })).rejects.toMatchObject({ code: "NOT_APPLICABLE" });
    await expect(getDatabase().documentRequirement.create({ data: { entityId, documentTypeId: type.id, revisionId: type.revisions[0].id } })).rejects.toThrow();
  });
  it("rechaza revisiones de otro tipo y no permite reasignar obligaciones existentes", async () => {
    const firstType = await newType(); const secondType = await newType();
    const firstEntity = await newStation(); const secondEntity = await newStation();
    await expect(getDatabase().documentRequirement.create({ data: { entityId: firstEntity.entityId, documentTypeId: firstType.id, revisionId: secondType.revisions[0].id } })).rejects.toThrow();
    const requirement = await assignDocumentRequirement(admin, { entityId: firstEntity.entityId, documentTypeId: firstType.id, typeVersion: 1 });
    await expect(getDatabase().documentRequirement.update({ where: { id: requirement.id }, data: { entityId: secondEntity.entityId } })).rejects.toThrow();
  });
  it("dos revisiones concurrentes no sobrescriben configuración ni duplican el número", async () => {
    const type = await newType();
    const results = await Promise.allSettled([10, 90].map((warningDays) => reviseDocumentType(admin, type.id, { ...configuration, warningDays, version: 1 })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getDatabase().documentTypeRevision.count({ where: { documentTypeId: type.id } })).toBe(2);
    expect((await getDatabase().documentType.findUniqueOrThrow({ where: { id: type.id } })).version).toBe(2);
  });
  it("un tipo inactivo conserva historia y rechaza nuevas asignaciones", async () => {
    const type = await newType();
    const first = await newStation();
    await assignDocumentRequirement(admin, { entityId: first.entityId, documentTypeId: type.id, typeVersion: 1 });
    await changeDocumentTypeActive(admin, type.id, { active: false, version: 1 });
    expect((await listDocumentRequirements(admin, { entityId: first.entityId })).items[0].documentType.active).toBe(false);
    const second = await newStation();
    await expect(assignDocumentRequirement(admin, { entityId: second.entityId, documentTypeId: type.id, typeVersion: 2 })).rejects.toMatchObject({ code: "INACTIVE_TYPE" });
  });
  it("rechaza asignar a una entidad inactiva", async () => {
    const type = await newType();
    const { station, entityId } = await newStation();
    await changeStationActive(admin, station.id, { active: false, version: 1 });
    await expect(assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 1 })).rejects.toMatchObject({ code: "INACTIVE_ENTITY" });
  });
  it("no transfiere entidades con obligaciones, incluso con escritura directa", async () => {
    const type = await newType();
    const { station, data, entityId } = await newStation();
    await assignDocumentRequirement(admin, { entityId, documentTypeId: type.id, typeVersion: 1 });
    await expect(updateStation(admin, station.id, { ...data, legalEntityId: companyB, version: 1 })).rejects.toMatchObject({ code: "DOCUMENTARY_DEPENDENCIES" });
    await expect(getDatabase().serviceStation.update({ where: { id: station.id }, data: { legalEntityId: companyB } })).rejects.toThrow();
    await expect(getDatabase().serviceStation.delete({ where: { id: station.id } })).rejects.toThrow();
    expect((await getDocumentableEntity(admin, entityId)).legalEntityId).toBe(companyA);
  });
  it("sin obligaciones la transferencia actualiza el registro sin dejar alcance obsoleto", async () => {
    const { station, data, entityId } = await newStation();
    await updateStation(admin, station.id, { ...data, legalEntityId: companyB, version: 1 });
    await expect(getDocumentableEntity(viewer, entityId)).rejects.toMatchObject({ status: 404 });
    expect((await getDocumentableEntity(admin, entityId)).legalEntityId).toBe(companyB);
  });
  it("serializa la asignación concurrente con una transferencia sin mover obligaciones silenciosamente", async () => {
    const type = await newType();
    const { station, data, entityId } = await newStation();
    const results = await Promise.allSettled([
      assignDocumentRequirement({ ...admin, allEntities: false, legalEntityIds: [companyA] }, { entityId, documentTypeId: type.id, typeVersion: 1 }),
      updateStation(admin, station.id, { ...data, legalEntityId: companyB, version: 1 }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const entity = await getDocumentableEntity(admin, entityId);
    const count = await getDatabase().documentRequirement.count({ where: { entityId } });
    expect(entity.legalEntityId === companyA || count === 0).toBe(true);
  });
  it("la asignación revierte si la auditoría falla", async () => {
    const type = await newType();
    const { entityId } = await newStation();
    await expect(assignDocumentRequirement({ ...admin, id: "missing-document-actor" }, { entityId, documentTypeId: type.id, typeVersion: 1 })).rejects.toThrow();
    expect(await getDatabase().documentRequirement.count({ where: { entityId } })).toBe(0);
  });
  it("sin asignaciones no muestra obligaciones ni métricas de otro alcance", async () => {
    const empty = await listDocumentRequirements({ ...viewer, legalEntityIds: [] }, {});
    expect(empty.items).toEqual([]); expect(empty.total).toBe(0);
  });
  it("acota y proyecta el catálogo sin devolver colecciones históricas", async () => {
    const result = await listDocumentTypes(admin, { q: runId });
    expect(result.items.length).toBeLessThanOrEqual(20);
    expect(result.items.every((item) => item.revisions.length === 1)).toBe(true);
  });
  it("busca solo el nombre de la última revisión y mantiene el código como clave estable", async () => {
    const oldName = `Nombre anterior ${randomUUID()}`;
    const newName = `Nombre actual ${randomUUID()}`;
    const type = await newType({ name: oldName });
    await reviseDocumentType(admin, type.id, { ...configuration, name: newName, version: 1 });
    expect((await listDocumentTypes(admin, { q: oldName })).total).toBe(0);
    const actual = await listDocumentTypes(admin, { q: newName.toUpperCase() });
    expect(actual.total).toBe(1);
    expect(actual.items[0].revisions[0].name).toBe(newName);
    expect((await listDocumentTypes(admin, { q: type.code })).items[0].id).toBe(type.id);
  });
  it("interpreta comodines SQL como texto literal, no como una búsqueda global", async () => {
    const marker = `Literal ${randomUUID()}`;
    const type = await newType({ name: `${marker} 100%_\\` });
    expect((await listDocumentTypes(admin, { q: `${marker} 100%_\\` })).items.map((item) => item.id)).toEqual([type.id]);
    expect((await listDocumentTypes(admin, { q: `${marker} 100__` })).total).toBe(0);
    expect((await listDocumentTypes(admin, { q: "' OR true --" })).total).toBe(0);
  });
  it("informa asignaciones existentes solo para la entidad y el alcance autorizados", async () => {
    const type = await newType();
    const first = await newStation(); const second = await newStation();
    const foreign = await newStation(companyB);
    const assigned = await assignDocumentRequirement(admin, { entityId: first.entityId, documentTypeId: type.id, typeVersion: 1 });
    expect((await listDocumentTypes(viewer, { q: type.code, entityId: first.entityId })).items[0].assignedRequirementId).toBe(assigned.id);
    expect((await listDocumentTypes(viewer, { q: type.code, entityId: second.entityId })).items[0].assignedRequirementId).toBeNull();
    expect((await listDocumentTypes(viewer, { q: type.code })).items[0].assignedRequirementId).toBeNull();
    await expect(listDocumentTypes(viewer, { entityId: foreign.entityId })).rejects.toMatchObject({ status: 404 });
    expect((await listDocumentRequirements(viewer, { entityId: first.entityId, requirementId: assigned.id })).total).toBe(1);
    expect((await listDocumentRequirements(viewer, { entityId: second.entityId, requirementId: assigned.id })).total).toBe(0);
    expect((await listDocumentRequirements({ ...viewer, legalEntityIds: [] }, { requirementId: assigned.id })).total).toBe(0);
  });
  it("las lecturas de obligaciones no agregan una consulta por cada entidad", async () => {
    const type = await newType();
    const ids = Array.from({ length: 25 }, () => randomUUID());
    stationIds.push(...ids);
    await getDatabase().serviceStation.createMany({ data: ids.map((id) => ({ ...stationData(), id })) });
    const entities = await getDatabase().documentableEntity.findMany({ where: { stationId: { in: ids } }, select: { id: true } });
    await getDatabase().documentRequirement.createMany({ data: entities.map((entity) => ({ entityId: entity.id, documentTypeId: type.id, revisionId: type.revisions[0].id })) });
    const observer = vi.spyOn(PgClient.prototype, "query");
    try {
      const first = await listDocumentRequirements(admin, { q: runId });
      const firstCount = observer.mock.calls.length;
      observer.mockClear();
      const second = await listDocumentRequirements(admin, { q: runId, page: 2 });
      const secondCount = observer.mock.calls.length;
      expect(first.items).toHaveLength(20);
      expect(second.items.length).toBeGreaterThan(0);
      expect(firstCount).toBeGreaterThan(0);
      expect(firstCount).toBeLessThanOrEqual(12);
      expect(secondCount).toBeLessThanOrEqual(firstCount + 1);
      expect(first.items[0].revision).not.toHaveProperty("fields");
    } finally { observer.mockRestore(); }
  });
  afterAll(async () => {
    const db = getDatabase();
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.documentRequirement.deleteMany({ where: { entity: { legalEntityId: { in: [companyA, companyB] } } } });
    await db.serviceStation.deleteMany({ where: { id: { in: stationIds } } });
    await db.legalEntity.deleteMany({ where: { id: { in: [companyA, companyB] } } });
    await db.user.delete({ where: { id: actorId } });
    // Immutable catalog revisions intentionally remain in this disposable database.
    await db.$disconnect();
  });
});
