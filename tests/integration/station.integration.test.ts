import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client as PgClient } from "pg";
import { getDatabase } from "@/infrastructure/database/client";
import { permissions, type Actor } from "@/domains/auth/access-policy";
import { createLegalEntity, changeLegalEntityActive } from "@/domains/legal-entities/legal-entity.service";
import { createStation, updateStation, changeStationActive } from "@/domains/stations/station.service";
import { getStation, listStations, listStationHistory, listStationCompanyOptions } from "@/domains/stations/station.queries";
import { exportStationsCsv } from "@/domains/stations/station-export.service";
import type { StationInput } from "@/domains/stations/station.schemas";

const url = process.env.TEST_DATABASE_URL;
if (!url || !/test/i.test(new URL(url).pathname) || url === process.env.DATABASE_URL) {
  throw new Error("Estaciones requiere TEST_DATABASE_URL aislada, diferente de DATABASE_URL, cuyo nombre contenga test.");
}
process.env.DATABASE_URL = url;
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= randomUUID() + randomUUID();

const actorId = randomUUID();
const runId = randomUUID();
const admin: Actor = { id: actorId, name: "QA estaciones", email: `${actorId}@example.invalid`, allEntities: true, legalEntityIds: [], permissions: [...permissions] };
const stationIds: string[] = [];
const companyIds: string[] = [];
const storeIds: string[] = [];
let sequence = 91000000;
let companyA: string;
let companyB: string;
let companyC: string;

async function company(name = `Empresa estaciones ${runId}`) {
  const base = `30${sequence++}`;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const digit = 11 - weights.reduce((total, weight, index) => total + Number(base[index]) * weight, 0) % 11;
  const item = await createLegalEntity(admin, {
    legalName: name, tradeName: name, cuit: `${base}${digit === 11 ? 0 : digit === 10 ? 9 : digit}`,
    address: "QA 123", province: "Buenos Aires", locality: "La Plata", responsible: "QA", email: "", phone: "",
  });
  companyIds.push(item.id);
  return item.id;
}

function payload(legalEntityId = companyA): StationInput {
  return { name: `Estación ${randomUUID()}`, code: randomUUID(), legalEntityId,
    operationalStatus: "OPERATIONAL", address: "QA 123", province: "Buenos Aires",
    locality: "La Plata", responsible: "QA", email: "", phone: "" };
}

async function station(data = payload()) {
  const item = await createStation(admin, data);
  stationIds.push(item.id);
  return item;
}

async function store(stationId: string, legalEntityId: string, active = true) {
  const id = randomUUID();
  storeIds.push(id);
  return getDatabase().store.create({ data: { id, stationId, legalEntityId, active, name: "Tienda QA",
    address: "QA", province: "QA", locality: "QA", responsible: "QA", phone: "", email: "" } });
}

describe("Estaciones en PostgreSQL real", () => {
  beforeAll(async () => {
    await getDatabase().user.create({ data: { id: actorId, name: admin.name, email: admin.email } });
    companyA = await company(); companyB = await company(); companyC = await company();
  });

  it("crea, normaliza y audita en la misma transacción", async () => {
    const item = await station({ ...payload(), code: " qa-centro " });
    expect(item.code).toBe("QA-CENTRO");
    expect(item.legalEntity.id).toBe(companyA);
    expect(item.active).toBe(true);
    expect((await listStationHistory(admin, item.id))[0].action).toBe("CREATE");
  });

  it("la BD impide códigos equivalentes incluso desde otro escritor", async () => {
    const id = randomUUID();
    stationIds.push(id);
    await expect(getDatabase().serviceStation.create({ data: { ...payload(), id, code: "qa-centro" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("el mismo código puede existir en otra razón social", async () => {
    expect((await station({ ...payload(companyB), code: "qa-centro" })).legalEntityId).toBe(companyB);
  });

  it("filtra y cuenta dentro del alcance antes de paginar", async () => {
    const scoped = { ...admin, allEntities: false, legalEntityIds: [companyA] };
    const result = await listStations(scoped, { pageSize: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].legalEntityId).toBe(companyA);
    expect(result.total).toBe(1);
    expect(result.items[0]).not.toHaveProperty("email");
    expect((await listStations(scoped, { legalEntityId: companyB })).total).toBe(0);
  });

  it("sin asignación no devuelve estaciones", async () => {
    const unassigned = { ...admin, allEntities: false, legalEntityIds: [] };
    expect((await listStations(unassigned, {})).items).toEqual([]);
    await expect(getStation(unassigned, stationIds[0])).rejects.toMatchObject({ status: 404 });
    await expect(listStationHistory(unassigned, stationIds[0])).rejects.toMatchObject({ status: 404 });
  });

  it("el visualizador no puede crear, editar, desactivar ni exportar", async () => {
    const viewer = { ...admin, allEntities: false, legalEntityIds: [companyA], permissions: ["stations:read"] };
    await expect(createStation(viewer, payload())).rejects.toMatchObject({ status: 403 });
    await expect(updateStation(viewer, stationIds[0], { ...payload(), version: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(changeStationActive(viewer, stationIds[0], { active: false, version: 1 })).rejects.toMatchObject({ status: 403 });
    await expect(exportStationsCsv(viewer, {}, [])).rejects.toMatchObject({ status: 403 });
    await expect(listStationHistory(viewer, stationIds[0])).rejects.toMatchObject({ status: 403 });
  });

  it("exige alcance tanto de origen como de destino al editar", async () => {
    const source = await station();
    const actor = { ...admin, allEntities: false, legalEntityIds: [companyA] };
    await expect(updateStation(actor, source.id, { ...payload(companyB), version: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(updateStation({ ...actor, legalEntityIds: [companyB] }, source.id, { ...payload(companyB), version: 1 })).rejects.toMatchObject({ status: 404 });
    expect((await getStation(admin, source.id)).legalEntityId).toBe(companyA);
  });

  it("permite transferencia explícita sin tiendas y registra el cambio", async () => {
    const data = payload();
    const source = await station(data);
    const updated = await updateStation(admin, source.id, { ...data, legalEntityId: companyB, version: 1 });
    expect(updated.legalEntityId).toBe(companyB);
    expect((await listStationHistory(admin, source.id))[0].action).toBe("TRANSFER");
    await expect(getStation({ ...admin, allEntities: false, legalEntityIds: [companyA] }, source.id)).rejects.toMatchObject({ status: 404 });
  });

  it("no transfiere por cascada tiendas, incluso si están inactivas", async () => {
    const data = payload();
    const source = await station(data);
    const child = await store(source.id, companyA, false);
    await expect(updateStation(admin, source.id, { ...data, legalEntityId: companyB, version: 1 })).rejects.toMatchObject({ code: "RELATED_STORES" });
    expect((await getDatabase().store.findUniqueOrThrow({ where: { id: child.id } })).legalEntityId).toBe(companyA);
  });

  it("conserva historial y bloquea baja con tiendas activas", async () => {
    const source = await station();
    const child = await store(source.id, companyA);
    await expect(changeStationActive(admin, source.id, { active: false, version: 1 })).rejects.toMatchObject({ code: "ACTIVE_DEPENDENCIES" });
    await getDatabase().store.update({ where: { id: child.id }, data: { active: false } });
    await changeStationActive(admin, source.id, { active: false, version: 1 });
    expect((await getStation(admin, source.id)).active).toBe(false);
    expect((await listStationHistory(admin, source.id))).toHaveLength(2);
  });

  it("no permite alta ni reactivación bajo una empresa inactiva", async () => {
    const data = payload(companyC);
    const source = await station(data);
    await changeStationActive(admin, source.id, { active: false, version: 1 });
    await changeLegalEntityActive(admin, companyC, { active: false, version: 1 });
    await expect(createStation(admin, payload(companyC))).rejects.toMatchObject({ code: "INACTIVE_PARENT" });
    await expect(changeStationActive(admin, source.id, { active: true, version: 2 })).rejects.toMatchObject({ code: "INACTIVE_PARENT" });
    const edited = await updateStation(admin, source.id, { ...data, responsible: "Histórico actualizado", version: 2 });
    expect(edited.active).toBe(false);
  });

  it("revierte la estación si falla la auditoría", async () => {
    const data = payload();
    await expect(createStation({ ...admin, id: "nonexistent-station-actor" }, data)).rejects.toMatchObject({ code: "P2003" });
    expect(await getDatabase().serviceStation.count({ where: { code: data.code.toUpperCase() } })).toBe(0);
  });

  it("rechaza versión obsoleta y escrituras concurrentes", async () => {
    const data = payload();
    const source = await station(data);
    const results = await Promise.allSettled([
      updateStation(admin, source.id, { ...data, name: "Concurrente A", version: 1 }),
      updateStation(admin, source.id, { ...data, name: "Concurrente B", version: 1 }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await getStation(admin, source.id)).version).toBe(2);
    await expect(changeStationActive(admin, source.id, { active: false, version: 1 })).rejects.toMatchObject({ status: 409 });
    expect(await getDatabase().auditLog.count({ where: { resourceType: "station", resourceId: source.id } })).toBe(2);
  });

  it("serializa la carrera entre alta de estación y baja de empresa", async () => {
    const parent = await company();
    const results = await Promise.allSettled([
      createStation(admin, payload(parent)),
      changeLegalEntityActive(admin, parent, { active: false, version: 1 }),
    ]);
    if (results[0].status === "fulfilled") stationIds.push(results[0].value.id);
    const actual = await getDatabase().legalEntity.findUniqueOrThrow({ where: { id: parent }, select: { active: true } });
    const activeChildren = await getDatabase().serviceStation.count({ where: { legalEntityId: parent, active: true } });
    expect(actual.active || activeChildren === 0).toBe(true);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  });

  it("filtra por operación sin confundirla con registro activo", async () => {
    const source = await station({ ...payload(), operationalStatus: "PAUSED" });
    const result = await listStations(admin, { q: source.code, operationalStatus: "PAUSED", active: "true" });
    expect(result.total).toBe(1);
    expect((await listStations(admin, { q: source.code, operationalStatus: "OPERATIONAL" })).total).toBe(0);
  });

  it("exporta filtros y selección autorizada sin filtrar datos de otra empresa", async () => {
    const source = await station({ ...payload(), name: "=SUM(A1)" });
    const scoped = { ...admin, allEntities: false, legalEntityIds: [companyA] };
    const csv = await exportStationsCsv(scoped, {}, [source.id]);
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain(source.code);
    const foreign = await station(payload(companyB));
    await expect(exportStationsCsv(scoped, {}, [foreign.id])).rejects.toMatchObject({ status: 404 });
    await expect(exportStationsCsv(scoped, { operationalStatus: "PAUSED" }, [source.id])).rejects.toMatchObject({ status: 404 });
  });

  it("paginar empresas no trunca silenciosamente las opciones", async () => {
    const name = `Selector QA ${runId}`;
    for (let index = 0; index < 21; index++) await company(`${name} ${index}`);
    const first = await listStationCompanyOptions(admin, { q: name });
    const second = await listStationCompanyOptions(admin, { q: name, page: 2 });
    expect(first.items).toHaveLength(20); expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(1); expect(second.hasMore).toBe(false);
    expect(first.items[0]).not.toHaveProperty("cuit");
    expect((await listStationCompanyOptions({ ...admin, allEntities: false, legalEntityIds: [companyA] }, { q: name })).items).toEqual([]);
  });

  it("no hace una consulta adicional por fila al pasar de 10 a 100 estaciones", async () => {
    const rows = Array.from({ length: 100 }, () => ({ ...payload(), id: randomUUID() }));
    stationIds.push(...rows.map((row) => row.id));
    await getDatabase().serviceStation.createMany({ data: rows });
    // Observe the real driver; no SQL or result is replaced by a mock.
    const queries = vi.spyOn(PgClient.prototype, "query");
    try {
      const first = await listStations(admin, { legalEntityId: companyA, pageSize: 10 });
      const countForTen = queries.mock.calls.length;
      queries.mockClear();
      const second = await listStations(admin, { legalEntityId: companyA, pageSize: 100 });
      const countForHundred = queries.mock.calls.length;
      expect(first.items).toHaveLength(10);
      expect(second.items).toHaveLength(100);
      expect(countForTen).toBeGreaterThan(0);
      expect(countForHundred).toBeLessThanOrEqual(countForTen + 1);
    } finally { queries.mockRestore(); }
  });

  afterAll(async () => {
    const db = getDatabase();
    await db.auditLog.deleteMany({ where: { actorId } });
    await db.store.deleteMany({ where: { id: { in: storeIds } } });
    await db.serviceStation.deleteMany({ where: { id: { in: stationIds } } });
    await db.legalEntity.deleteMany({ where: { id: { in: companyIds } } });
    await db.user.deleteMany({ where: { id: actorId } });
    await db.$disconnect();
  });
});
