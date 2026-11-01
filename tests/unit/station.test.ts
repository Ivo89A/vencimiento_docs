import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { stationSchema, updateStationSchema, stationActiveSchema, stationQuerySchema, companyOptionQuerySchema } from "@/domains/stations/station.schemas";
import { stationWhere } from "@/domains/stations/station.queries";
import { createStation, updateStation, changeStationActive } from "@/domains/stations/station.service";
import { exportStationsCsv } from "@/domains/stations/station-export.service";
import type { Actor } from "@/domains/auth/access-policy";

const companyId = randomUUID();
const data = {
  name: "Estación Centro", code: " centro-01 ", legalEntityId: companyId,
  operationalStatus: "OPERATIONAL", address: "Calle 123", province: "Buenos Aires",
  locality: "La Plata", responsible: "Administración", phone: "", email: "",
};
const viewer: Actor = { id: "viewer", name: "Consulta", email: "viewer@example.invalid",
  allEntities: false, legalEntityIds: [companyId], permissions: ["stations:read"] };

describe("Contratos de estaciones", () => {
  it("normaliza código y espacios", () => {
    expect(stationSchema.parse({ ...data, name: " Estación Centro " })).toMatchObject({ name: "Estación Centro", code: "CENTRO-01" });
  });
  it.each([
    { name: "" }, { code: " " }, { code: "x".repeat(51) }, { legalEntityId: "not-uuid" },
    { operationalStatus: "VIGENTE" }, { email: "no-email" }, { responsible: " " },
    { active: false }, { allEntities: true }, { version: 1 },
  ])("rechaza entrada inválida o campos extra %o", (changes) => {
    expect(stationSchema.safeParse({ ...data, ...changes }).success).toBe(false);
  });
  it("exige versión al editar", () => expect(updateStationSchema.safeParse(data).success).toBe(false));
  it("no confunde estado operativo con baja lógica", () => {
    expect(stationSchema.safeParse({ ...data, operationalStatus: "CLOSED" }).success).toBe(true);
    expect(stationActiveSchema.safeParse({ active: "false", version: 1 }).success).toBe(false);
  });
  it("acepta filtros vacíos de formulario como no seleccionados", () => {
    expect(stationQuerySchema.parse({ legalEntityId: "", operationalStatus: "" })).toMatchObject({ legalEntityId: undefined, operationalStatus: undefined });
  });
  it.each([{ page: 0 }, { pageSize: 101 }, { q: "x".repeat(101) }, { sort: "email" }, { order: "DROP TABLE" }, { legalEntityId: "bad" }])("acota consultas %o", (query) => {
    expect(stationQuerySchema.safeParse(query).success).toBe(false);
  });
  it("acota la búsqueda de empresas", () => {
    expect(companyOptionQuerySchema.safeParse({ page: -1 }).success).toBe(false);
    expect(companyOptionQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
  it("interseca filtro empresarial con alcance en vez de reemplazarlo", () => {
    const otherId = randomUUID();
    expect(stationWhere(viewer, stationQuerySchema.parse({ legalEntityId: otherId }))).toMatchObject({
      AND: [{ legalEntityId: { in: [companyId] } }, { legalEntityId: otherId }, { active: true }],
    });
  });
});

describe("Autorización antes de acceso a PostgreSQL", () => {
  it("rechaza alta del visualizador", async () => {
    await expect(createStation(viewer, data)).rejects.toMatchObject({ status: 403 });
  });
  it("rechaza edición del visualizador", async () => {
    await expect(updateStation(viewer, randomUUID(), { ...data, version: 1 })).rejects.toMatchObject({ status: 403 });
  });
  it("rechaza cambio de estado del visualizador", async () => {
    await expect(changeStationActive(viewer, randomUUID(), { active: false, version: 1 })).rejects.toMatchObject({ status: 403 });
  });
  it("no concede exportación por tener lectura", async () => {
    await expect(exportStationsCsv(viewer, {}, [])).rejects.toMatchObject({ status: 403 });
  });
  it("no concede alcance global por tener escritura", async () => {
    await expect(createStation({ ...viewer, permissions: ["stations:write"] }, { ...data, legalEntityId: randomUUID() })).rejects.toMatchObject({ status: 404 });
  });
});
