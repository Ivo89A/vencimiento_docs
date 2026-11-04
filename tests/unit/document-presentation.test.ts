import { describe, expect, it } from "vitest";
import { changePresentationSchema, createPresentationSchema, validatePresentationContent } from "@/domains/documents/document-presentation.schemas";
import { formatCivilDate } from "@/lib/date";

const policy = { expires: true, fields: [
  { key: "numero", label: "Número", type: "TEXT", required: true },
  { key: "verificado", label: "Verificado", type: "BOOLEAN", required: false },
] };
const content = { issuedOn: "2026-11-04", expiresOn: "2027-11-04", values: { numero: " B-123 ", verificado: false }, notes: " Nota " };

describe("Metadatos de presentaciones, sin evidencia ni aprobación", () => {
  it("formatea fechas civiles sin desplazarlas al día anterior de Buenos Aires", () => {
    expect(formatCivilDate("2026-11-04")).toBe("04/11/2026");
  });
  it("normaliza campos contra la configuración fijada y conserva false", () => {
    expect(validatePresentationContent(policy, content)).toEqual({ ...content, values: { numero: "B-123", verificado: false }, notes: "Nota" });
  });
  it("exige vencimiento cuando corresponde", () => {
    expect(() => validatePresentationContent(policy, { ...content, expiresOn: null })).toThrow("Indicá la fecha");
  });
  it("no inventa vencimiento para un tipo sin fecha", () => {
    expect(() => validatePresentationContent({ ...policy, expires: false }, content)).toThrow("no admite fecha");
    expect(validatePresentationContent({ ...policy, expires: false }, { ...content, expiresOn: null }).expiresOn).toBeNull();
  });
  it("rechaza emisión posterior al vencimiento", () => {
    expect(() => validatePresentationContent(policy, { ...content, issuedOn: "2028-01-01" })).toThrow("anterior");
  });
  it.each(["2026-02-29", "2026-11-04T00:00:00Z", "0000-01-01", "04/11/2026"])("rechaza fecha inválida %s", (issuedOn) => {
    expect(() => validatePresentationContent(policy, { ...content, issuedOn })).toThrow();
  });
  it("rechaza campos desconocidos, faltantes y tipos incorrectos", () => {
    for (const values of [{ numero: "a", otro: "dato" }, {}, { numero: 123 }, { numero: "a", verificado: "false" }]) {
      expect(() => validatePresentationContent(policy, { ...content, values })).toThrow();
    }
  });
  it("no acepta que el cliente elija revisión, estado, autor ni objeto S3", () => {
    const base = { ...content, requirementVersion: 1, requestId: "0f529e5e-7b1f-4a68-a291-30ef72b5bd90" };
    expect(createPresentationSchema.safeParse(base).success).toBe(true);
    for (const extra of [{ revisionId: base.requestId }, { status: "APPROVED" }, { createdById: "x" }, { key: "quarantine/x" }]) {
      expect(createPresentationSchema.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });
  it("cancelar no permite reescribir el contenido", () => {
    expect(changePresentationSchema.safeParse({ action: "CANCEL", version: 1 }).success).toBe(true);
    expect(changePresentationSchema.safeParse({ action: "CANCEL", version: 1, notes: "otro" }).success).toBe(false);
    expect(changePresentationSchema.safeParse({ action: "APPROVE", version: 1 }).success).toBe(false);
  });
});
