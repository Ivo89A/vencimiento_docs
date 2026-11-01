import { describe, expect, it } from "vitest";
import { createDocumentTypeSchema, assignDocumentSchema, validateDocumentFields } from "@/domains/documents/document.schemas";
import { createDocumentType } from "@/domains/documents/document-type.service";
import { assignDocumentRequirement } from "@/domains/documents/document-requirement.service";
import type { Actor } from "@/domains/auth/access-policy";

const configuration = {
  code: " bomberos ", name: "Certificado de bomberos", description: "Ejemplo configurable", category: "Seguridad",
  appliesTo: ["STATION"], required: true, criticality: "HIGH", requiresApproval: true,
  expires: true, warningDays: 30, alertDays: [60, 30, 15, 7, 0], fields: [],
};
const viewer: Actor = { id: "viewer", name: "Consulta", email: "viewer@example.invalid", allEntities: false, legalEntityIds: [], permissions: ["documents:read"] };
describe("Contratos documentales", () => {
  it("normaliza el código", () => expect(createDocumentTypeSchema.parse(configuration).code).toBe("BOMBEROS"));
  it.each([
    { appliesTo: [] }, { appliesTo: ["STATION", "STATION"] }, { appliesTo: ["UNKNOWN"] },
    { warningDays: -1 }, { warningDays: 3651 }, { alertDays: [30, 30] }, { alertDays: [-1] },
    { required: "true" }, { active: true }, { code: "dos palabras" },
    { fields: [{ key: "nro", label: "Número", type: "FILE", required: true }] },
    { fields: [{ key: "nro", label: "Número", type: "TEXT", required: true }, { key: "nro", label: "Otro", type: "TEXT", required: false }] },
  ])("rechaza configuración inválida %o", (changes) => expect(createDocumentTypeSchema.safeParse({ ...configuration, ...changes }).success).toBe(false));
  it("exige la versión elegida al asignar", () => expect(assignDocumentSchema.safeParse({ entityId: crypto.randomUUID(), documentTypeId: crypto.randomUUID() }).success).toBe(false));
  it("valida valores con tipos estrictos y claves conocidas", () => {
    const fields = [
      { key: "numero", label: "Número", type: "TEXT", required: true },
      { key: "fecha", label: "Fecha", type: "DATE", required: false },
      { key: "importe", label: "Importe", type: "NUMBER", required: false },
      { key: "verificado", label: "Verificado", type: "BOOLEAN", required: false },
    ];
    expect(validateDocumentFields(fields, { numero: " 123 ", fecha: "2028-02-29", importe: 2, verificado: false })).toMatchObject({ numero: "123", verificado: false });
    for (const values of [{}, { numero: "" }, { numero: "123", ajeno: true }, { numero: "123", fecha: "2027-02-29" }, { numero: "123", importe: "2" }, { numero: "123", verificado: "false" }]) {
      expect(() => validateDocumentFields(fields, values)).toThrow();
    }
  });
  it("el visualizador no configura ni asigna", async () => {
    await expect(createDocumentType(viewer, configuration)).rejects.toMatchObject({ status: 403 });
    await expect(assignDocumentRequirement(viewer, {})).rejects.toMatchObject({ status: 403 });
  });
  it("el permiso de configuración no concede alcance global", async () => {
    await expect(createDocumentType({ ...viewer, permissions: ["documents:configure"] }, configuration)).rejects.toMatchObject({ status: 403 });
  });
});
