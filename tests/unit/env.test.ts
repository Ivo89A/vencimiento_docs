import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { getRuntimeEnv } from "@/lib/env";

afterEach(() => vi.unstubAllEnvs());

function configureTestEnvironment() {
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/unused_test");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("BETTER_AUTH_SECRET", randomUUID() + randomUUID());
  vi.stubEnv("NODE_ENV", "test");
}

describe("Configuración segura", () => {
  it("acepta un entorno completo sin conectarse a la base", () => {
    configureTestEnvironment();
    expect(getRuntimeEnv().BETTER_AUTH_URL).toBe("http://localhost:3000");
  });
  it("no usa un secreto de respaldo cuando falta configuración", () => {
    configureTestEnvironment();
    vi.stubEnv("BETTER_AUTH_SECRET", undefined);
    expect(() => getRuntimeEnv()).toThrow("BETTER_AUTH_SECRET");
  });
  it("rechaza secretos demasiado cortos", () => {
    configureTestEnvironment();
    vi.stubEnv("BETTER_AUTH_SECRET", "short");
    expect(() => getRuntimeEnv()).toThrow("BETTER_AUTH_SECRET");
  });
  it("no acepta SQLite como sustituto silencioso de PostgreSQL", () => {
    configureTestEnvironment();
    vi.stubEnv("DATABASE_URL", "file:///development.db");
    expect(() => getRuntimeEnv()).toThrow("DATABASE_URL");
  });
  it("exige HTTPS en producción", () => {
    configureTestEnvironment();
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getRuntimeEnv()).toThrow("HTTPS");
  });
  it("no incluye valores de secretos en los errores", () => {
    configureTestEnvironment();
    const secret = randomUUID();
    vi.stubEnv("DATABASE_URL", `invalid-${secret}`);
    try {
      getRuntimeEnv();
      expect.unreachable("Se esperaba rechazo de configuración");
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
      expect((error as Error).message).toContain("DATABASE_URL");
    }
  });
});
