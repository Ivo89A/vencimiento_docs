import { z } from "zod";

export const documentEntityKinds = ["LEGAL_ENTITY", "STATION", "STORE", "VEHICLE"] as const;
export const documentEntityLabels = { LEGAL_ENTITY: "Razón social", STATION: "Estación", STORE: "Tienda", VEHICLE: "Rodado" };
export const criticalityLabels = { HIGH: "Alta", MEDIUM: "Media", LOW: "Baja" };
const label = z.string().trim().min(1).max(200);
const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/, "La clave debe empezar con una letra minúscula y contener solo letras, números o guion bajo.")
    .refine((key) => !["constructor", "prototype"].includes(key), "Elegí otra clave de campo."),
  label,
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN"]),
  required: z.boolean(),
}).strict();

export const documentConfigurationSchema = z.object({
  name: label,
  description: z.string().trim().max(2000),
  category: label,
  appliesTo: z.array(z.enum(documentEntityKinds)).min(1).max(4).refine((items) => new Set(items).size === items.length, "No repitas entidades."),
  required: z.boolean(),
  criticality: z.enum(["HIGH", "MEDIUM", "LOW"]),
  requiresApproval: z.boolean(),
  expires: z.boolean(),
  warningDays: z.number().int().min(0).max(3650),
  alertDays: z.array(z.number().int().min(0).max(3650)).max(20)
    .refine((days) => new Set(days).size === days.length, "No repitas anticipaciones."),
  fields: z.array(fieldSchema).max(30).refine((fields) => new Set(fields.map((field) => field.key)).size === fields.length, "Las claves de campo deben ser únicas."),
}).strict();
export const createDocumentTypeSchema = documentConfigurationSchema.extend({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_-]{0,49}$/, "El código debe empezar con una letra y contener solo letras, números o guiones (máximo 50 caracteres)."),
}).strict();
export const reviseDocumentTypeSchema = documentConfigurationSchema.extend({ version: z.number().int().positive() }).strict();
export const documentTypeActiveSchema = z.object({ active: z.boolean(), version: z.number().int().positive() }).strict();
export const assignDocumentSchema = z.object({ entityId: z.uuid(), documentTypeId: z.uuid(), typeVersion: z.number().int().positive() }).strict();
export const documentQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  entityId: z.uuid().optional(),
  requirementId: z.uuid().optional(),
}).strict();
export type DocumentConfiguration = z.infer<typeof documentConfigurationSchema>;

// Used by the upcoming presentation pipeline; no values bypass the pinned field definition.
export function validateDocumentFields(definitions: unknown, input: unknown) {
  const fields = z.array(fieldSchema).max(30).parse(definitions);
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    let value: z.ZodType;
    switch (field.type) {
      case "TEXT": value = z.string().trim().min(1).max(2000); break;
      case "NUMBER": value = z.number().finite(); break;
      case "DATE": value = z.iso.date(); break;
      case "BOOLEAN": value = z.boolean(); break;
    }
    // defineProperty avoids special prototype keys becoming schema properties accidentally.
    Object.defineProperty(shape, field.key, { value: field.required ? value : value.optional(), enumerable: true });
  }
  return z.object(shape).strict().parse(input);
}
