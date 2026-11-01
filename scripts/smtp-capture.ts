/** Local-only SMTP capture for isolated E2E. Never import or deploy as an application mail service. */
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const port = Number(process.env.E2E_SMTP_PORT);
const directory = process.env.E2E_MAILBOX_DIR;
if (!directory || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("SMTP_TEST_CONFIGURATION");
}
const server = new SMTPServer({
  name: "localhost", secure: false, authOptional: true, logger: false,
  disabledCommands: ["AUTH", "STARTTLS"], size: 1024 * 1024,
  onData(stream, session, callback) {
    const receive = async () => {
      const parsed = await simpleParser(stream);
      await writeFile(join(directory, `${randomUUID()}.json`), JSON.stringify({
        recipients: session.envelope.rcptTo.map((recipient) => recipient.address.toLowerCase()),
        text: parsed.text ?? "",
      }), { mode: 0o600 });
    };
    void receive().then(() => callback(), () => callback(new Error("SMTP_TEST_CAPTURE_FAILED")));
  },
});
server.on("error", () => { console.error("smtp_test_server_failed"); process.exit(1); });
server.listen(port, "127.0.0.1", () => process.send?.("ready"));
process.once("SIGTERM", () => server.close(() => process.exit(0)));
