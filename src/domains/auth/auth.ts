import { betterAuth } from "better-auth";
import { randomUUID } from "node:crypto";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { after } from "next/server";
import { getDatabase } from "@/infrastructure/database/client";
import { sendEmail } from "@/infrastructure/email/send-email";
import { getRuntimeEnv } from "@/lib/env";

function createAuth() {
  const env = getRuntimeEnv();
  const db = getDatabase();
  return betterAuth({
    appName: "Gestión documental",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 1800,
      async sendResetPassword({ user, url }) {
        after(async () => {
          try { await sendEmail({ to: user.email, subject: "Recuperación de acceso — Gestión documental", text: `Usá este enlace para definir una nueva contraseña. Vence en 30 minutos:\n\n${url}\n\nSi no lo solicitaste, ignorá este mensaje.` }); }
          catch { console.error("password_reset_email_failed"); }
        });
      },
      async onPasswordReset({ user }) {
        await db.auditLog.create({ data: { actorId: user.id, action: "PASSWORD_RESET", resourceType: "user", resourceId: user.id, changes: {} } });
      },
    },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/request-password-reset": { window: 300, max: 3 } },
    },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production", database: { generateId: () => randomUUID() } },
    databaseHooks: {
      session: {
        create: {
          async before(session) {
            const user = await db.user.findUnique({ where: { id: session.userId }, select: { active: true } });
            if (!user?.active) return false;
          },
          async after(session) {
            await db.auditLog.create({ data: { actorId: session.userId, action: "LOGIN", resourceType: "user", resourceId: session.userId, changes: {} } });
          },
        },
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
