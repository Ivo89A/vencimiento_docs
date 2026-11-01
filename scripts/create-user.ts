import "dotenv/config";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { emitKeypressEvents } from "node:readline";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { getDatabase } from "../src/infrastructure/database/client";
import { permissions } from "../src/domains/auth/access-policy";

async function readPassword(): Promise<string> {
  if (process.env.CREATE_USER_PASSWORD) return process.env.CREATE_USER_PASSWORD;
  if (!process.stdin.isTTY) throw new Error("Usá una terminal interactiva o CREATE_USER_PASSWORD mediante un gestor de secretos.");
  process.stdout.write("Contraseña (no se mostrará): ");
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => { process.stdin.removeListener("keypress", onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    const onKey = (character: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === "c") { cleanup(); reject(new Error("Operación cancelada.")); return; }
      if (key.name === "return" || key.name === "enter") { cleanup(); resolve(value); return; }
      if (key.name === "backspace") { value = value.slice(0, -1); return; }
      const isPrintable = character && [...character].every((item) => {
        const code = item.codePointAt(0)!;
        return code >= 32 && code !== 127;
      });
      if (isPrintable && !key.ctrl) value += character;
    };
    process.stdin.on("keypress", onKey);
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    name: { type: "string" }, email: { type: "string" }, role: { type: "string" },
    "legal-entity": { type: "string", multiple: true },
  } });
  const input = z.object({ name: z.string().trim().min(2).max(200), email: z.email().transform((value) => value.toLowerCase()), role: z.enum(["Administrador", "Visualizador"]), legalEntityIds: z.array(z.uuid()) }).parse({
    name: values.name, email: values.email, role: values.role, legalEntityIds: values["legal-entity"] ?? [],
  });
  if (input.role === "Visualizador" && input.legalEntityIds.length === 0) {
    throw new Error("El visualizador requiere al menos un --legal-entity con un ID existente. No se concede alcance global por defecto.");
  }
  const password = z.string().min(12).max(128).parse(await readPassword());
  const passwordHash = await hashPassword(password);
  const db = getDatabase();
  const userId = randomUUID();
  await db.$transaction(async (tx) => {
    for (const code of permissions) await tx.permission.upsert({ where: { code }, create: { code }, update: {} });
    const role = await tx.role.upsert({ where: { name: input.role }, update: {}, create: {
      name: input.role,
      description: input.role === "Administrador" ? "Administración del grupo" : "Consulta de información asignada",
    } });
    const codes = input.role === "Administrador" ? permissions : permissions.filter((code) => code.endsWith(":read") && code !== "audit:read");
    for (const code of codes) await tx.rolePermission.upsert({ where: { roleId_permissionCode: { roleId: role.id, permissionCode: code } }, update: {}, create: { roleId: role.id, permissionCode: code } });
    await tx.user.create({ data: {
      id: userId, name: input.name, email: input.email, emailVerified: true,
      allEntities: input.role === "Administrador",
      accounts: { create: { id: randomUUID(), accountId: userId, providerId: "credential", password: passwordHash } },
      roles: { create: { roleId: role.id } },
      access: { create: input.legalEntityIds.map((legalEntityId) => ({ legalEntityId })) },
    } });
    await tx.auditLog.create({ data: { actorId: userId, action: "PROVISION_USER_CLI", resourceType: "user", resourceId: userId, changes: { role: input.role, allEntities: input.role === "Administrador", legalEntityIds: input.legalEntityIds } } });
  });
  console.log("Usuario creado. No se imprimieron ni almacenaron contraseñas en texto plano.");
}

main().catch((error: unknown) => {
  if (error instanceof z.ZodError) console.error("Argumentos o contraseña inválidos. Indicá --name, --email, --role y una contraseña de 12 a 128 caracteres.");
  else console.error("No se pudo crear el usuario. Verificá configuración, datos únicos y razones sociales asignadas.");
  process.exitCode = 1;
}).finally(async () => {
  try { await getDatabase().$disconnect(); } catch { /* Configuration may be absent. */ }
});
