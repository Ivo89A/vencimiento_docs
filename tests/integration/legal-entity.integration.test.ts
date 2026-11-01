import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase } from "@/infrastructure/database/client";
import { permissions, type Actor } from "@/domains/auth/access-policy";
import { changeLegalEntityActive, createLegalEntity, exportLegalEntitiesCsv, getLegalEntity, listLegalEntities, updateLegalEntity } from "@/domains/legal-entities/legal-entity.service";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname) || url === process.env.DATABASE_URL) {
  throw new Error("Definí TEST_DATABASE_URL a una base aislada cuyo nombre contenga test, diferente de DATABASE_URL. Aplicá antes las migraciones a esa base.");
}
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= randomUUID() + randomUUID();

const adminId = randomUUID();
const viewerId = randomUUID();
const admin: Actor = { id: adminId, name: "Administrador de prueba", email: `${adminId}@example.invalid`, allEntities: true, legalEntityIds: [], permissions: [...permissions] };
const viewer: Actor = { id: viewerId, name: "Visualizador de prueba", email: `${viewerId}@example.invalid`, allEntities: false, legalEntityIds: [], permissions: ["legal-entities:read"] };
const companyIds: string[] = [];
const stationId = randomUUID();
const invalidStoreId = randomUUID();
const data = { legalName: "Empresa integración", tradeName: "Integración", cuit: "20123456786", address: "Calle 123", province: "Buenos Aires", locality: "La Plata", responsible: "QA", email: "", phone: "" };

describe("Razones sociales en PostgreSQL", () => {
  beforeAll(async () => {
    await getDatabase().user.createMany({ data: [{ id: adminId, name: admin.name, email: admin.email }, { id: viewerId, name: viewer.name, email: viewer.email }] });
  });

  it("crea y audita atómicamente", async () => {
    const created = await createLegalEntity(admin, data);
    companyIds.push(created.id);
    const event = await getDatabase().auditLog.findFirst({ where: { resourceId: created.id, actorId: adminId } });
    expect(event?.action).toBe("CREATE");
    expect(created.cuit).toBe("20123456786");
  });
  it("rechaza un CUIT duplicado mediante constraint", async () => {
    await expect(createLegalEntity(admin, data)).rejects.toMatchObject({ code: "P2002" });
  });
  it("sin alcance no devuelve registros ni totales", async () => {
    const result = await listLegalEntities(viewer, {});
    expect(result.total).toBe(0); expect(result.items).toEqual([]);
    await expect(getLegalEntity(viewer, companyIds[0])).rejects.toMatchObject({ status: 404 });
  });
  it("con alcance permite consulta pero no escritura", async () => {
    const scoped = { ...viewer, legalEntityIds: [companyIds[0]] };
    expect((await getLegalEntity(scoped, companyIds[0])).id).toBe(companyIds[0]);
    await expect(createLegalEntity(scoped, data)).rejects.toMatchObject({ status: 403 });
    await expect(updateLegalEntity(scoped, companyIds[0], { ...data, version: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(changeLegalEntityActive(scoped, companyIds[0], { active: false, version: 1 })).rejects.toMatchObject({ status: 403 });
  });
  it("edita y rechaza versión obsoleta", async () => {
    const updated = await updateLegalEntity(admin, companyIds[0], { ...data, tradeName: "Actualizada", version: 1 });
    expect(updated.version).toBe(2);
    await expect(updateLegalEntity(admin, companyIds[0], { ...data, version: 1 })).rejects.toMatchObject({ status: 409 });
  });
  it("preserva registro e historial al desactivar", async () => {
    await changeLegalEntityActive(admin, companyIds[0], { active: false, version: 2 });
    expect((await getLegalEntity(admin, companyIds[0])).active).toBe(false);
    expect(await getDatabase().auditLog.count({ where: { resourceId: companyIds[0] } })).toBe(3);
  });
  it("revierte el alta si no se puede registrar la auditoría", async () => {
    await expect(createLegalEntity({ ...admin, id: "nonexistent-actor" }, { ...data, cuit: "30712345671" })).rejects.toMatchObject({ code: "P2003" });
    expect(await getDatabase().legalEntity.count({ where: { cuit: "30712345671" } })).toBe(0);
  });
  it("dos ediciones concurrentes no sobrescriben silenciosamente", async () => {
    const results = await Promise.allSettled([
      updateLegalEntity(admin, companyIds[0], { ...data, tradeName: "Concurrente A", version: 3 }),
      updateLegalEntity(admin, companyIds[0], { ...data, tradeName: "Concurrente B", version: 3 }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await getLegalEntity(admin, companyIds[0])).version).toBe(4);
  });
  it("impide desactivar una empresa con dependencias activas", async () => {
    await changeLegalEntityActive(admin, companyIds[0], { active: true, version: 4 });
    await getDatabase().serviceStation.create({ data: {
      id: stationId, legalEntityId: companyIds[0], name: "Estación QA", code: stationId,
      address: "Calle QA", province: "Buenos Aires", locality: "La Plata", responsible: "QA", phone: "", email: "",
    } });
    await expect(changeLegalEntityActive(admin, companyIds[0], { active: false, version: 5 })).rejects.toMatchObject({ code: "ACTIVE_DEPENDENCIES", status: 409 });
    expect((await getLegalEntity(admin, companyIds[0])).active).toBe(true);
  });
  it("la FK compuesta impide asociar tienda a estación de otra empresa", async () => {
    const company = await createLegalEntity(admin, { ...data, cuit: "30712345671", legalName: "Otra empresa QA" });
    companyIds.push(company.id);
    await expect(getDatabase().store.create({ data: {
      id: invalidStoreId, legalEntityId: company.id, stationId, name: "Tienda inválida",
      address: "QA", province: "QA", locality: "QA", responsible: "QA", phone: "", email: "",
    } })).rejects.toMatchObject({ code: "P2003" });
  });
  it("exporta solo el filtro autorizado y deniega exportar al visualizador por defecto", async () => {
    const csv = await exportLegalEntitiesCsv(admin, { q: "Otra empresa QA", active: "all" }, []);
    expect(csv).toContain("Otra empresa QA");
    expect(csv).not.toContain("Empresa integración");
    await expect(exportLegalEntitiesCsv(viewer, {}, [])).rejects.toMatchObject({ status: 403 });
    await expect(exportLegalEntitiesCsv({ ...admin, allEntities: false, legalEntityIds: [companyIds[0]] }, { active: "all" }, [companyIds[1]])).rejects.toMatchObject({ status: 404 });
  });

  afterAll(async () => {
    const db = getDatabase();
    // Only rows created by this test run, in the explicitly isolated test database.
    await db.auditLog.deleteMany({ where: { actorId: { in: [adminId, viewerId] } } });
    await db.store.deleteMany({ where: { id: invalidStoreId } });
    await db.serviceStation.deleteMany({ where: { id: stationId } });
    await db.legalEntity.deleteMany({ where: { id: { in: companyIds } } });
    await db.user.deleteMany({ where: { id: { in: [adminId, viewerId] } } });
    await db.$disconnect();
  });
});
