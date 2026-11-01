import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readJson, requireSameOrigin } from "@/lib/http";

afterEach(() => vi.unstubAllEnvs());

describe("Entrada HTTP", () => {
  it("lee JSON", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Empresa" }) });
    await expect(readJson(request)).resolves.toEqual({ name: "Empresa" });
  });
  it("rechaza tipo incorrecto", async () => {
    await expect(readJson(new Request("http://localhost/api", { method: "POST", body: "name=Empresa" }))).rejects.toMatchObject({ status: 415 });
  });
  it("rechaza JSON roto", async () => {
    await expect(readJson(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).rejects.toMatchObject({ status: 400 });
  });
  it("limita el cuerpo aunque no haya Content-Length", async () => {
    await expect(readJson(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "x".repeat(66000) }) }))).rejects.toMatchObject({ status: 413 });
  });
  it.each([undefined, "https://attacker.invalid", "http://localhost:3001"])("rechaza origen no autorizado %s", (origin) => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/unused_test");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("BETTER_AUTH_SECRET", randomUUID() + randomUUID());
    vi.stubEnv("NODE_ENV", "test");
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api", { method: "POST", headers: origin ? { Origin: origin } : {} }))).toThrow("Origen de la solicitud no autorizado");
  });
  it("acepta el origen configurado", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/unused_test");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("BETTER_AUTH_SECRET", randomUUID() + randomUUID());
    vi.stubEnv("NODE_ENV", "test");
    expect(() => requireSameOrigin(new Request("http://localhost:3000/api", { method: "POST", headers: { Origin: "http://localhost:3000" } }))).not.toThrow();
  });
});
