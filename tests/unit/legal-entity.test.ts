import { describe, expect, it } from "vitest";
import { changeActiveSchema, isValidCuit, legalEntityQuerySchema, legalEntitySchema, updateLegalEntitySchema } from "@/domains/legal-entities/legal-entity.schemas";

const input = { legalName: "Empresa de pruebas SA", tradeName: "Empresa", cuit: "20-12345678-6", address: "Calle 123", province: "Buenos Aires", locality: "La Plata", email: "", phone: "", responsible: "Responsable" };

describe("Validación de razones sociales", () => {
  it("normaliza CUIT y espacios", () => {
    const result = legalEntitySchema.parse({ ...input, legalName: "  Empresa SA  " });
    expect(result.cuit).toBe("20123456786");
    expect(result.legalName).toBe("Empresa SA");
  });
  it.each(["20123456780", "00000000000", "11111111111", "123", "ABCDEFGHIJK", ""])('rechaza CUIT inválido "%s"', (cuit) => {
    expect(isValidCuit(cuit)).toBe(false);
  });
  it("acepta un CUIT con verificador correcto", () => expect(isValidCuit("20123456786")).toBe(true));
  it("no acepta un nombre vacío", () => expect(legalEntitySchema.safeParse({ ...input, legalName: "  " }).success).toBe(false));
  it("no acepta un email inválido", () => expect(legalEntitySchema.safeParse({ ...input, email: "no-email" }).success).toBe(false));
  it("rechaza campos no permitidos", () => expect(legalEntitySchema.safeParse({ ...input, allEntities: true }).success).toBe(false));
  it("exige versión al editar", () => expect(updateLegalEntitySchema.safeParse(input).success).toBe(false));
  it("rechaza versión cero", () => expect(changeActiveSchema.safeParse({ active: false, version: 0 }).success).toBe(false));
  it("no interpreta string false como booleano", () => expect(changeActiveSchema.safeParse({ active: "false", version: 1 }).success).toBe(false));
});

describe("Consultas acotadas", () => {
  it("establece límites por defecto", () => {
    expect(legalEntityQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20, active: "true", sort: "legalName" });
  });
  it.each([{ page: 0 }, { pageSize: 101 }, { pageSize: -1 }, { page: "NaN" }, { sort: "password" }, { order: "DROP TABLE" }, { q: "x".repeat(101) }, { unexpected: true }])("rechaza consultas inválidas %o", (query) => {
    expect(legalEntityQuerySchema.safeParse(query).success).toBe(false);
  });
  it("interpreta números provenientes de query string", () => expect(legalEntityQuerySchema.parse({ page: "2", pageSize: "50" })).toMatchObject({ page: 2, pageSize: 50 }));
});
