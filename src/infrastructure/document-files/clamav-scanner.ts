import { createConnection, type Socket } from "node:net";
import { once } from "node:events";
import { DocumentFileInfrastructureError } from "./document-file.errors";
import { resolvePrivateAddress } from "./private-network";

export type MalwareScanResult = { status: "CLEAN" } | { status: "INFECTED" };
type ScannerOptions = { host: string; port: number; maxBytes: number; timeoutMs: number };
const maxReplyBytes = 1024;

export function parseClamAvReply(reply: string): MalwareScanResult {
  if (reply === "stream: OK") return { status: "CLEAN" };
  if (reply.startsWith("stream: ") && reply.endsWith(" FOUND")) {
    const signature = reply.slice(8, -6);
    if (signature.length >= 1 && signature.length <= 256 && [...signature].every((character) => {
      const code = character.codePointAt(0)!;
      return code >= 32 && code !== 127;
    })) return { status: "INFECTED" };
  }
  throw new DocumentFileInfrastructureError("ANTIVIRUS_PROTOCOL");
}

/** clamd INSTREAM over private TCP. No filename/path command, public TCP or fail-open result. */
export class ClamAvScanner {
  constructor(private readonly options: ScannerOptions) {}

  async scan(content: Uint8Array): Promise<MalwareScanResult> {
    if (!content.byteLength || content.byteLength > this.options.maxBytes) throw new DocumentFileInfrastructureError("FILE_SIZE");
    const snapshot = Buffer.from(content);
    const controller = new AbortController();
    let socket: Socket | undefined;
    let rejectDeadline: (error: Error) => void = () => undefined;
    const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
    const timer = setTimeout(() => {
      controller.abort();
      rejectDeadline(new DocumentFileInfrastructureError("ANTIVIRUS_UNAVAILABLE"));
    }, this.options.timeoutMs);
    try {
      const operation = async () => {
        const address = await resolvePrivateAddress(this.options.host, controller.signal);
        socket = createConnection({ host: address.address, family: address.family, port: this.options.port, signal: controller.signal });
        // Install reply/error listeners before sending; the daemon may respond early on a limit error.
        const reply = this.readReply(socket);
        const send = async () => {
          await once(socket!, "connect", { signal: controller.signal });
          await this.write(socket!, Buffer.from("zINSTREAM\0"));
          for (let offset = 0; offset < snapshot.byteLength; offset += 64 * 1024) {
            controller.signal.throwIfAborted();
            const chunk = snapshot.subarray(offset, Math.min(offset + 64 * 1024, snapshot.byteLength));
            const length = Buffer.alloc(4);
            length.writeUInt32BE(chunk.byteLength);
            await this.write(socket!, length);
            await this.write(socket!, chunk);
          }
          await this.write(socket!, Buffer.alloc(4));
        };
        const [, response] = await Promise.all([send(), reply]);
        return parseClamAvReply(response);
      };
      return await Promise.race([operation(), deadline]);
    } catch (error) {
      if (error instanceof DocumentFileInfrastructureError) throw error;
      throw new DocumentFileInfrastructureError("ANTIVIRUS_UNAVAILABLE");
    } finally {
      clearTimeout(timer);
      controller.abort();
      socket?.destroy();
    }
  }

  private write(socket: Socket, bytes: Uint8Array) {
    return new Promise<void>((resolve, reject) => socket.write(bytes, (error) => error ? reject(error) : resolve()));
  }

  private readReply(socket: Socket) {
    return new Promise<string>((resolve, reject) => {
      let data = Buffer.alloc(0);
      let ended = false;
      const fail = () => reject(new DocumentFileInfrastructureError("ANTIVIRUS_PROTOCOL"));
      socket.on("data", (chunk: Buffer) => {
        if (data.length + chunk.length > maxReplyBytes) { fail(); socket.destroy(); return; }
        data = Buffer.concat([data, chunk]);
      });
      socket.once("error", () => reject(new DocumentFileInfrastructureError("ANTIVIRUS_UNAVAILABLE")));
      socket.once("end", () => {
        ended = true;
        const end = data.indexOf(0);
        if (end !== data.length - 1 || end < 0) { fail(); return; }
        resolve(data.subarray(0, end).toString("utf8"));
      });
      socket.once("close", () => { if (!ended) fail(); });
    });
  }
}
