import { z } from "zod";

const runtimeSchema = z.object({
  DATABASE_URL: z.url().refine((url) => /^postgres(ql)?:\/\//.test(url), "Se requiere PostgreSQL."),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
});

export function getRuntimeEnv() {
  const result = runtimeSchema.safeParse(process.env);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Configuración incompleta o inválida: ${fields}. Consultá .env.example.`);
  }
  if (process.env.NODE_ENV === "production" && !result.data.BETTER_AUTH_URL.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL debe usar HTTPS en producción.");
  }
  return result.data;
}

const booleanSetting = z.enum(["true", "false"]).transform((value) => value === "true");
const documentFileSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),
  S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)
    .refine((value) => !value.includes("..") && !/^\d+\.\d+\.\d+\.\d+$/.test(value)),
  S3_ACCESS_KEY_ID: z.string().min(1).max(1024),
  S3_SECRET_ACCESS_KEY: z.string().min(1).max(4096),
  S3_SESSION_TOKEN: z.string().max(8192).optional(),
  S3_FORCE_PATH_STYLE: booleanSetting.default(false),
  DOCUMENT_FILES_MAX_BYTES: z.coerce.number().int().min(1).max(25 * 1024 * 1024).default(10 * 1024 * 1024),
  DOCUMENT_FILES_TIMEOUT_MS: z.coerce.number().int().min(100).max(120000).default(30000),
  ANTIVIRUS_HOST: z.string().min(1).max(253).regex(/^[a-zA-Z0-9.:-]+$/),
  ANTIVIRUS_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
});

export class DocumentFileConfigurationError extends Error {
  readonly code = "DOCUMENT_FILES_CONFIG";
  constructor(public readonly fields: readonly string[]) {
    super(`Configuración documental incompleta o inválida: ${fields.join(", ")}. Consultá .env.example.`);
    this.name = "DocumentFileConfigurationError";
  }
}

/** Separate and lazy: configuring authentication never enables uploads or requires S3. */
export function getDocumentFileEnv(source: Readonly<Record<string, string | undefined>> = process.env) {
  const values = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]));
  const result = documentFileSchema.safeParse(values);
  if (!result.success) throw new DocumentFileConfigurationError([...new Set(result.error.issues.map((issue) => String(issue.path[0])))]);
  const endpoint = new URL(result.data.S3_ENDPOINT);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/" ||
    (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback && result.data.NODE_ENV !== "production"))) {
    throw new DocumentFileConfigurationError(["S3_ENDPOINT"]);
  }
  return result.data;
}

export type DocumentFileEnv = ReturnType<typeof getDocumentFileEnv>;
