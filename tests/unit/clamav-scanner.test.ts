import { createServer, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { ClamAvScanner, parseClamAvReply } from "@/infrastructure/document-files/clamav-scanner";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

/** Wire-protocol fixture, not ClamAV and not evidence of real malware detection. */
async function daemon(reply: (socket: Socket, received: Buffer) => void) {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => undefined);
    socket.on("close", () => sockets.delete(socket));
    let bytes = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      bytes = Buffer.concat([bytes, chunk]);
      if (bytes.length < 10) return;
      if (bytes.subarray(0, 10).toString() !== "zINSTREAM\0") { socket.end("UNKNOWN COMMAND\0"); return; }
      let offset = 10;
      const content: Buffer[] = [];
      while (offset + 4 <= bytes.length) {
        const length = bytes.readUInt32BE(offset); offset += 4;
        if (length === 0) { reply(socket, Buffer.concat(content)); return; }
        if (offset + length > bytes.length) return;
        content.push(bytes.subarray(offset, offset + length)); offset += length;
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TEST_LISTEN");
  cleanups.push(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  return new ClamAvScanner({ host: "127.0.0.1", port: address.port, maxBytes: 1024 * 1024, timeoutMs: 500 });
}

describe("Respuesta clamd fail-closed", () => {
  it("solo reconoce la respuesta limpia exacta", () => expect(parseClamAvReply("stream: OK")).toEqual({ status: "CLEAN" }));
  it("infección no expone el texto del proveedor", () => expect(parseClamAvReply("stream: Unit.Test.Signature FOUND")).toEqual({ status: "INFECTED" }));
  it.each(["OK", "stream: OK extra", "stream: limit exceeded ERROR", "stream: ", "stream: OK\n", "stream: ERROR FOUND\n", ""]) ("no aprueba %j", (reply) => expect(() => parseClamAvReply(reply)).toThrow());
});

describe("Transporte INSTREAM real contra fixture TCP local", () => {
  it("envía chunks big-endian, terminador y todos los bytes sin depender del nombre", async () => {
    const content = Buffer.alloc(150000, 65);
    let received: Buffer | undefined;
    const scanner = await daemon((socket, bytes) => { received = bytes; socket.end("stream: OK\0"); });
    expect(await scanner.scan(content)).toEqual({ status: "CLEAN" });
    expect(received).toEqual(content);
  });
  it("reconstruye respuestas fragmentadas", async () => {
    const scanner = await daemon((socket) => { socket.write("stream: "); socket.end("OK\0"); });
    expect(await scanner.scan(Buffer.from("test"))).toEqual({ status: "CLEAN" });
  });
  it("conserva una copia de los bytes mientras espera conexión", async () => {
    let received: Buffer | undefined;
    const scanner = await daemon((socket, bytes) => { received = bytes; socket.end("stream: OK\0"); });
    const content = Buffer.from("original");
    const result = scanner.scan(content);
    content.fill(0);
    expect(await result).toEqual({ status: "CLEAN" });
    expect(received?.toString()).toBe("original");
  });
  it("distingue infección de análisis fallido", async () => {
    const scanner = await daemon((socket) => socket.end("stream: Unit.Test FOUND\0"));
    expect(await scanner.scan(Buffer.from("test"))).toEqual({ status: "INFECTED" });
  });
  it.each(["stream: OK", "stream: OK\0trailing", "stream: OK\0\0", "stream: limit exceeded ERROR\0", "x".repeat(2048)])("rechaza trama incompleta, excedida o ambigua", async (reply) => {
    const scanner = await daemon((socket) => socket.end(reply));
    await expect(scanner.scan(Buffer.from("test"))).rejects.toMatchObject({ code: "ANTIVIRUS_PROTOCOL" });
  });
  it("no queda esperando indefinidamente si el daemon no responde", async () => {
    const scanner = await daemon(() => undefined);
    await expect(scanner.scan(Buffer.from("test"))).rejects.toMatchObject({ code: "ANTIVIRUS_UNAVAILABLE" });
  });
  it("rechaza vacíos, excesos y TCP público sin conectarse", async () => {
    const scanner = new ClamAvScanner({ host: "8.8.8.8", port: 3310, maxBytes: 4, timeoutMs: 100 });
    await expect(scanner.scan(Buffer.alloc(0))).rejects.toMatchObject({ code: "FILE_SIZE" });
    await expect(scanner.scan(Buffer.alloc(5))).rejects.toMatchObject({ code: "FILE_SIZE" });
    await expect(scanner.scan(Buffer.from("test"))).rejects.toMatchObject({ code: "ANTIVIRUS_UNSAFE_ADDRESS" });
  });
});
