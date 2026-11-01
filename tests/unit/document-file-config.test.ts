import { describe, expect, it } from "vitest";
import { DocumentFileConfigurationError, getDocumentFileEnv } from "@/lib/env";
import { isPrivateNetworkAddress, resolvePrivateAddress } from "@/infrastructure/document-files/private-network";

const configured = {
  NODE_ENV: "test", S3_ENDPOINT: "https://storage.example.invalid", S3_REGION: "us-east-1",
  S3_BUCKET: "gestion-test", S3_ACCESS_KEY_ID: "unit-access", S3_SECRET_ACCESS_KEY: "unit-secret-not-real",
  ANTIVIRUS_HOST: "127.0.0.1",
};

describe("Configuración documental separada y segura", () => {
  it("no inventa credenciales ni usa un bucket predeterminado", () => {
    expect(() => getDocumentFileEnv({})).toThrow(DocumentFileConfigurationError);
  });
  it("usa límites acotados y convierte false sin truthiness", () => {
    const config = getDocumentFileEnv({ ...configured, S3_FORCE_PATH_STYLE: "false" });
    expect(config.S3_FORCE_PATH_STYLE).toBe(false);
    expect(config.DOCUMENT_FILES_MAX_BYTES).toBe(10485760);
    expect(config.ANTIVIRUS_PORT).toBe(3310);
    expect(getDocumentFileEnv({ ...configured, S3_FORCE_PATH_STYLE: "true" }).S3_FORCE_PATH_STYLE).toBe(true);
  });
  it("solo permite HTTP de loopback en desarrollo/pruebas", () => {
    expect(getDocumentFileEnv({ ...configured, S3_ENDPOINT: "http://127.0.0.1:9000" }).S3_ENDPOINT).toBe("http://127.0.0.1:9000");
    expect(() => getDocumentFileEnv({ ...configured, NODE_ENV: "production", S3_ENDPOINT: "http://127.0.0.1:9000" })).toThrow();
    expect(() => getDocumentFileEnv({ ...configured, S3_ENDPOINT: "http://storage.example.invalid" })).toThrow();
  });
  it.each([
    { S3_ENDPOINT: "https://user:password@storage.example.invalid" },
    { S3_ENDPOINT: "https://storage.example.invalid/?secret=value" },
    { S3_ENDPOINT: "https://storage.example.invalid/#token" },
    { S3_ENDPOINT: "https://storage.example.invalid/path" },
    { S3_ENDPOINT: "ftp://storage.example.invalid" },
    { S3_BUCKET: "../public" }, { S3_BUCKET: "bucket..test" }, { S3_BUCKET: "127.0.0.1" },
    { S3_FORCE_PATH_STYLE: "yes" }, { S3_REGION: "" },
    { DOCUMENT_FILES_MAX_BYTES: "0" }, { DOCUMENT_FILES_MAX_BYTES: "26214401" },
    { DOCUMENT_FILES_TIMEOUT_MS: "0" }, { DOCUMENT_FILES_TIMEOUT_MS: "120001" },
    { ANTIVIRUS_PORT: "65536" }, { ANTIVIRUS_HOST: "http://clamav:3310" },
  ])("rechaza valores inseguros %o", (values) => expect(() => getDocumentFileEnv({ ...configured, ...values })).toThrow(DocumentFileConfigurationError));
  it("los errores solo contienen nombres de variables, nunca valores ni credenciales", () => {
    try { getDocumentFileEnv({ ...configured, S3_ENDPOINT: "https://unit-access:unit-secret-not-real@storage.example.invalid" }); }
    catch (error) {
      expect(error).toBeInstanceOf(DocumentFileConfigurationError);
      expect(String(error)).toContain("S3_ENDPOINT");
      expect(String(error)).not.toContain("unit-secret-not-real");
      expect(String(error)).not.toContain("unit-access");
    }
  });
});

describe("Clamd TCP solo en red privada", () => {
  it.each(["127.0.0.1", "10.0.0.1", "172.16.0.1", "172.31.255.254", "192.168.1.1", "::1", "fd00::1", "fc00::1", "::ffff:127.0.0.1"])("acepta %s", (address) => expect(isPrivateNetworkAddress(address)).toBe(true));
  it.each(["0.0.0.0", "8.8.8.8", "169.254.169.254", "172.15.0.1", "172.32.0.1", "192.169.0.1", "::", "2001:4860:4860::8888", "::ffff:8.8.8.8", "::ffff:808:808", "localhost", "not-an-ip"])("rechaza %s", (address) => expect(isPrivateNetworkAddress(address)).toBe(false));
  it("deniega una dirección pública antes de conectarse", async () => {
    await expect(resolvePrivateAddress("8.8.8.8", new AbortController().signal)).rejects.toMatchObject({ code: "ANTIVIRUS_UNSAFE_ADDRESS" });
  });
});
