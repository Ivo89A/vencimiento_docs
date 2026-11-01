import { z } from "zod";

export function isValidCuit(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;
  return checkDigit === Number(value[10]);
}

const requiredText = z.string().trim().min(1, "Completá este campo.").max(200, "Máximo 200 caracteres.");
const optionalEmail = z.union([z.literal(""), z.email("Ingresá un email válido.").max(254)]);

export const legalEntitySchema = z.object({
  legalName: requiredText,
  tradeName: requiredText,
  cuit: z.string().transform((value) => value.replace(/[-\s]/g, "")).refine(isValidCuit, "El CUIT debe tener 11 dígitos y un dígito verificador válido."),
  address: requiredText,
  province: requiredText,
  locality: requiredText,
  email: optionalEmail,
  phone: z.string().trim().max(50),
  responsible: requiredText,
}).strict();

export const updateLegalEntitySchema = legalEntitySchema.extend({ version: z.number().int().min(1) }).strict();
export const changeActiveSchema = z.object({ active: z.boolean(), version: z.number().int().min(1) }).strict();
export const idSchema = z.uuid("Identificador inválido.");

export const legalEntityQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  active: z.enum(["true", "false", "all"]).default("true"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["legalName", "createdAt"]).default("legalName"),
  order: z.enum(["asc", "desc"]).default("asc"),
}).strict();

export type LegalEntityInput = z.input<typeof legalEntitySchema>;
export type LegalEntityData = z.output<typeof legalEntitySchema>;
