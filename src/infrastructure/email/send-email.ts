import nodemailer from "nodemailer";
import { z } from "zod";

const smtpSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.email(),
});

export async function sendEmail(message: { to: string; subject: string; text: string }) {
  const result = smtpSchema.safeParse(process.env);
  if (!result.success) throw new Error("SMTP_CONFIGURATION_MISSING");
  const env = result.data;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE === "true",
    requireTLS: env.SMTP_SECURE !== "true" && process.env.NODE_ENV === "production",
    tls: { minVersion: "TLSv1.2" },
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000, socketTimeout: 10000,
  });
  await transport.sendMail({ from: env.SMTP_FROM, ...message });
}
