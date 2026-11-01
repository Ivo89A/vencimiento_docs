/** Disposable real PostgreSQL cluster. No Windows service, global installation or application .env edits. */
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { Client } from "pg";

async function findFreePort(): Promise<number> {
  const server = createServer();
  return new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") { server.close(); reject(new Error("PORT_ALLOCATION")); return; }
      server.close((error) => error ? reject(error) : done(address.port));
    });
  });
}

function run(executable: string, args: string[], env: NodeJS.ProcessEnv = process.env, quiet = false) {
  // On Windows the detached postgres child can retain pipe handles and prevent EOF indefinitely.
  const result = spawnSync(executable, args, { env, stdio: quiet ? "ignore" : "inherit", timeout: 600000, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`COMMAND_FAILED: ${executable.split(/[\\/]/).at(-1)}`);
}

async function main() {
  const bin = process.env.POSTGRES_BIN;
  const npm = process.env.npm_execpath;
  if (!bin || !npm) throw new Error("Ejecutá npm run verify:postgres con POSTGRES_BIN apuntando a binarios PostgreSQL confiables.");
  const binary = (name: string) => join(resolve(bin), process.platform === "win32" ? `${name}.exe` : name);
  const root = join(tmpdir(), "opencode");
  await mkdir(root, { recursive: true });
  const temporary = await mkdtemp(join(root, "gestion-pg-test-"));
  const dataDir = join(temporary, "data");
  const passwordPath = join(temporary, "password");
  const password = randomBytes(32).toString("hex");
  const secret = randomBytes(48).toString("base64url");
  const port = await findFreePort();
  const url = (database: string) => `postgresql://gestion_test:${password}@127.0.0.1:${port}/${database}`;
  const env = { ...process.env, BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: secret };
  const npmRun = (name: string, extra: string[] = [], overrides: Partial<NodeJS.ProcessEnv> = {}) => run(process.execPath, [npm, "run", name, ...extra], { ...env, ...overrides });
  await writeFile(passwordPath, password, { mode: 0o600 });
  let started = false;
  let smtp: ChildProcess | undefined;
  try {
    run(binary("initdb"), ["-D", dataDir, "-U", "gestion_test", `--pwfile=${passwordPath}`, "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C"], env, true);
    await unlink(passwordPath);
    started = true;
    run(binary("pg_ctl"), ["-D", dataDir, "-l", join(temporary, "postgres.log"), "-w", "-o", `-h 127.0.0.1 -p ${port}`, "start"], env, true);
    const client = new Client({ connectionString: url("postgres") });
    await client.connect();
    try {
      const version = await client.query<{ server_version: string }>("SHOW server_version");
      console.log(`PostgreSQL real temporal: ${version.rows[0].server_version}. Solo localhost; credenciales efímeras no impresas.`);
      await client.query('CREATE DATABASE "gestion_integration_test"');
      await client.query('CREATE DATABASE "gestion_e2e_test"');
    } finally { await client.end(); }
    npmRun("db:deploy", [], { DATABASE_URL: url("gestion_integration_test") });
    npmRun("test:integration", [], { DATABASE_URL: url("unused_development_database"), TEST_DATABASE_URL: url("gestion_integration_test") });
    npmRun("db:deploy", [], { DATABASE_URL: url("gestion_e2e_test") });

    const adminPassword = randomBytes(24).toString("base64url");
    const viewerPassword = randomBytes(24).toString("base64url");
    const e2eEnv = { DATABASE_URL: url("gestion_e2e_test") };
    npmRun("user:create", ["--", "--name", "Administrador QA", "--email", "admin@example.invalid", "--role", "Administrador"], { ...e2eEnv, CREATE_USER_PASSWORD: adminPassword });
    const fixtureClient = new Client({ connectionString: e2eEnv.DATABASE_URL });
    await fixtureClient.connect();
    let companyId: string;
    try {
      const fixture = await fixtureClient.query<{ id: string }>(`INSERT INTO legal_entities (id, "legalName", "tradeName", cuit, address, province, locality, email, phone, responsible, "updatedAt") VALUES (gen_random_uuid(), 'Empresa autorizada QA', 'Empresa autorizada QA', '20123456786', 'Calle QA', 'Buenos Aires', 'La Plata', '', '', 'QA', now()) RETURNING id`);
      companyId = fixture.rows[0].id;
    } finally { await fixtureClient.end(); }
    npmRun("user:create", ["--", "--name", "Visualizador QA", "--email", "viewer@example.invalid", "--role", "Visualizador", "--legal-entity", companyId], { ...e2eEnv, CREATE_USER_PASSWORD: viewerPassword });
    const resetPassword = randomBytes(24).toString("base64url");
    for (const device of ["chromium", "mobile"]) {
      npmRun("user:create", ["--", "--name", `Recuperación QA ${device}`, "--email", `reset-${device}@example.invalid`, "--role", "Visualizador", "--legal-entity", companyId], { ...e2eEnv, CREATE_USER_PASSWORD: resetPassword });
    }
    const mailbox = join(temporary, "mailbox");
    await mkdir(mailbox);
    const smtpPort = await findFreePort();
    smtp = spawn(process.execPath, ["--import", "tsx", join(process.cwd(), "scripts/smtp-capture.ts")], {
      env: { ...env, E2E_SMTP_PORT: String(smtpPort), E2E_MAILBOX_DIR: mailbox },
      stdio: ["ignore", "ignore", "inherit", "ipc"], windowsHide: true,
    });
    await once(smtp, "message", { signal: AbortSignal.timeout(15000) });
    npmRun("test:e2e", [], {
      ...e2eEnv, E2E_ADMIN_EMAIL: "admin@example.invalid", E2E_ADMIN_PASSWORD: adminPassword,
      E2E_VIEWER_EMAIL: "viewer@example.invalid", E2E_VIEWER_PASSWORD: viewerPassword, E2E_COMPANY_ID: companyId,
      E2E_DATABASE_URL: e2eEnv.DATABASE_URL, E2E_RESET_PASSWORD: resetPassword, E2E_MAILBOX_DIR: mailbox,
      SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtpPort), SMTP_SECURE: "false", SMTP_FROM: "system@example.invalid", SMTP_USER: "", SMTP_PASSWORD: "",
      CI: "1",
    });
    console.log("Verificación PostgreSQL + E2E completada. El cluster temporal se detendrá.");
  } finally {
    smtp?.kill();
    if (started) run(binary("pg_ctl"), ["-D", dataDir, "-m", "fast", "-w", "stop"], env, true);
    await unlink(passwordPath).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && /^(Ejecutá|COMMAND_FAILED)/.test(error.message) ? error.message : "Falló la infraestructura temporal de pruebas. Revisá los resultados anteriores; no se modificó el entorno de producción.");
  process.exitCode = 1;
});
