import { describe, expect, it } from "vitest";
import { canAccessLegalEntity, childEntityScope, hasPermission, legalEntityScope, requireLegalEntityAccess, requirePermission, type Actor } from "@/domains/auth/access-policy";

const viewer: Actor = { id: "viewer", name: "Visualizador", email: "viewer@example.invalid", allEntities: false, permissions: ["legal-entities:read"], legalEntityIds: ["company-a"] };

describe("Permisos y alcance", () => {
  it("permite consultar con permiso", () => expect(hasPermission(viewer, "legal-entities:read")).toBe(true));
  it("deniega escritura al visualizador", () => expect(() => requirePermission(viewer, "legal-entities:write")).toThrow("No tenés permiso"));
  it("permite empresa asignada", () => expect(canAccessLegalEntity(viewer, "company-a")).toBe(true));
  it("oculta empresa de otro alcance", () => expect(() => requireLegalEntityAccess(viewer, "company-b")).toThrow("no encontrado o sin acceso"));
  it("sin asignaciones no concede acceso", () => expect(canAccessLegalEntity({ ...viewer, legalEntityIds: [] }, "company-a")).toBe(false));
  it("permiso de escritura no concede alcance global", () => expect(canAccessLegalEntity({ ...viewer, permissions: ["legal-entities:write"] }, "company-b")).toBe(false));
  it("alcance global no concede permisos", () => expect(hasPermission({ ...viewer, allEntities: true }, "legal-entities:write")).toBe(false));
  it("filtra razones sociales antes de paginar", () => expect(legalEntityScope(viewer)).toEqual({ id: { in: ["company-a"] } }));
  it("filtra entidades hijas por su razón social", () => expect(childEntityScope(viewer)).toEqual({ legalEntityId: { in: ["company-a"] } }));
  it("global permite alcance completo", () => {
    expect(legalEntityScope({ ...viewer, allEntities: true })).toEqual({});
    expect(canAccessLegalEntity({ ...viewer, allEntities: true }, "company-b")).toBe(true);
  });
});
