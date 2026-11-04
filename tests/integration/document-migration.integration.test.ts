import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { expect, it } from "vitest";

it("migra entidades existentes sin recrear IDs, datos ni versiones y completa sus cuatro registros documentables", async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/i.test(new URL(url).pathname) || url === process.env.DATABASE_URL) throw new Error("La migración requiere TEST_DATABASE_URL aislada.");
  const client = new Client({ connectionString: url });
  const schema = `document_migration_test_${randomUUID().replaceAll("-", "")}`;
  await client.connect();
  let created = false;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    for (const migration of ["202610310001_initial", "202610310002_business_constraints", "202610310003_stations"]) {
      await client.query(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    }
    const company = randomUUID(); const station = randomUUID(); const store = randomUUID(); const vehicle = randomUUID();
    await client.query(`INSERT INTO legal_entities (id, "legalName", "tradeName", cuit, address, province, locality, email, phone, responsible, version, "updatedAt")
      VALUES ($1, 'Empresa previa', 'Previa', '30999999991', 'QA', 'QA', 'QA', '', '', 'QA', 7, now())`, [company]);
    await client.query(`INSERT INTO service_stations (id, "legalEntityId", name, code, address, province, locality, responsible, phone, email, version, "updatedAt")
      VALUES ($1, $2, 'Estación previa', 'PREVIA', 'QA', 'QA', 'QA', 'QA', '', '', 4, now())`, [station, company]);
    await client.query(`INSERT INTO stores (id, "legalEntityId", "stationId", name, address, province, locality, responsible, phone, email, "updatedAt")
      VALUES ($1, $2, $3, 'Tienda previa', 'QA', 'QA', 'QA', 'QA', '', '', now())`, [store, company, station]);
    await client.query(`INSERT INTO vehicles (id, "legalEntityId", plate, "fileNumber", "vehicleType", brand, model, year, responsible, "updatedAt")
      VALUES ($1, $2, 'AA123BB', '1', 'Auto', 'QA', 'QA', 2020, 'QA', now())`, [vehicle, company]);
    await client.query(await readFile("prisma/migrations/202610310004_document_requirements/migration.sql", "utf8"));
    const registries = await client.query(`SELECT kind, "legalEntityId", "companyId", "stationId", "storeId", "vehicleId" FROM documentable_entities ORDER BY kind`);
    expect(registries.rows).toHaveLength(4);
    expect(registries.rows.every((row) => row.legalEntityId === company)).toBe(true);
    expect(registries.rows.map((row) => row.companyId ?? row.stationId ?? row.storeId ?? row.vehicleId).sort()).toEqual([company, station, store, vehicle].sort());
    expect((await client.query(`SELECT id, name, version FROM service_stations`)).rows).toEqual([{ id: station, name: "Estación previa", version: 4 }]);
    expect((await client.query(`SELECT id, version FROM legal_entities`)).rows).toEqual([{ id: company, version: 7 }]);
    const typeId = randomUUID(); const revisionId = randomUUID(); const requirementId = randomUUID();
    await client.query(`INSERT INTO document_types (id, code) VALUES ($1, 'PREVIO')`, [typeId]);
    await client.query(`INSERT INTO document_type_revisions (id, "documentTypeId", number, name, description, category,
      "appliesTo", required, criticality, "requiresApproval", expires, "warningDays", "alertDays", fields)
      VALUES ($1, $2, 1, 'Previo', '', 'QA', ARRAY['STATION']::"DocumentEntityKind"[], true, 'HIGH', true, true, 30, ARRAY[30,0], '[]')`, [revisionId, typeId]);
    await client.query(`INSERT INTO document_requirements (id, "entityId", "documentTypeId", "revisionId", version)
      SELECT $1, id, $2, $3, 4 FROM documentable_entities WHERE "stationId" = $4`, [requirementId, typeId, revisionId, station]);
    await client.query(await readFile("prisma/migrations/202611040005_document_presentations/migration.sql", "utf8"));
    expect((await client.query(`SELECT id, "revisionId", version FROM document_requirements`)).rows)
      .toEqual([{ id: requirementId, revisionId, version: 4 }]);
    expect((await client.query(`SELECT count(*)::int AS total FROM document_presentations`)).rows[0].total).toBe(0);
    expect((await client.query(`SELECT count(*)::int AS total FROM role_permissions rp JOIN roles r ON r.id = rp."roleId"
      WHERE r.name = 'Visualizador' AND rp."permissionCode" = 'documents:present'`)).rows[0].total).toBe(0);
  } finally {
    await client.query("ROLLBACK");
    if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
}, 30000);
