import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePrivateAddress } from "@/infrastructure/document-files/private-network";

const { lookupAll } = vi.hoisted(() => ({ lookupAll: vi.fn<(host: string, options: { all: true; verbatim: true }) => Promise<Array<{ address: string; family: number }>>>() }));
vi.mock("node:dns/promises", () => ({ lookup: lookupAll }));
beforeEach(() => { lookupAll.mockReset(); });

describe("Resolución DNS privada previa a clamd", () => {
  it("resuelve una vez y devuelve una dirección literal validada", async () => {
    lookupAll.mockResolvedValue([{ address: "10.0.0.2", family: 4 }, { address: "fd00::2", family: 6 }]);
    expect(await resolvePrivateAddress("clamav.internal", new AbortController().signal)).toEqual({ address: "10.0.0.2", family: 4 });
    expect(lookupAll).toHaveBeenCalledExactlyOnceWith("clamav.internal", { all: true, verbatim: true });
  });
  it("rechaza DNS mixto privado/público en vez de escoger solo la primera IP", async () => {
    lookupAll.mockResolvedValue([{ address: "10.0.0.2", family: 4 }, { address: "8.8.8.8", family: 4 }]);
    await expect(resolvePrivateAddress("clamav.internal", new AbortController().signal)).rejects.toMatchObject({ code: "ANTIVIRUS_UNSAFE_ADDRESS" });
  });
  it("rechaza DNS vacío", async () => {
    lookupAll.mockResolvedValue([]);
    await expect(resolvePrivateAddress("clamav.internal", new AbortController().signal)).rejects.toMatchObject({ code: "ANTIVIRUS_UNSAFE_ADDRESS" });
  });
  it("no incluye el error del resolver en la respuesta", async () => {
    lookupAll.mockRejectedValue(new Error("unit-secret-resolver-payload"));
    try { await resolvePrivateAddress("clamav.internal", new AbortController().signal); throw new Error("EXPECTED_REJECTION"); }
    catch (error) {
      expect(error).toMatchObject({ code: "ANTIVIRUS_UNAVAILABLE" });
      expect(String(error)).not.toContain("unit-secret-resolver-payload");
    }
  });
  it("no resuelve si el plazo ya se agotó", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(resolvePrivateAddress("clamav.internal", controller.signal)).rejects.toThrow();
    expect(lookupAll).not.toHaveBeenCalled();
  });
  it("no permite conectar si el plazo se agotó durante DNS", async () => {
    const controller = new AbortController();
    lookupAll.mockImplementation(async () => { controller.abort(); return [{ address: "10.0.0.2", family: 4 }]; });
    await expect(resolvePrivateAddress("clamav.internal", controller.signal)).rejects.toThrow();
  });
});
