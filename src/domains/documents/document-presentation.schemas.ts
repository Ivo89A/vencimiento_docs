import { z } from "zod";
import { DomainError } from "@/lib/errors";
import { validateDocumentFields } from "./document.schemas";

const civilDate = z.iso.date().refine((value) => !value.startsWith("0000"), "La fecha debe tener un año válido.");
export const presentationContentSchema = z.object({
  issuedOn: civilDate.nullable(),
  expiresOn: civilDate.nullable(),
  values: z.record(z.string().max(50), z.union([z.string().max(2000), z.number().finite(), z.boolean()]))
    .refine((values) => Object.keys(values).length <= 30, "Se admiten hasta 30 campos."),
  notes: z.string().trim().max(2000),
}).strict();
export const createPresentationSchema = presentationContentSchema.extend({
  requirementVersion: z.number().int().positive(), requestId: z.uuid(),
}).strict();
export const updatePresentationSchema = presentationContentSchema.extend({
  action: z.literal("UPDATE"), version: z.number().int().positive(),
}).strict();
export const changePresentationSchema = z.discriminatedUnion("action", [
  updatePresentationSchema,
  z.object({ action: z.literal("CANCEL"), version: z.number().int().positive() }).strict(),
]);
export const presentationQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();

/** Uses the assigned revision, never the latest catalog revision or client-provided policy. */
export function validatePresentationContent(policy: { expires: boolean; fields: unknown }, input: unknown) {
  const data = presentationContentSchema.parse(input);
  if (policy.expires && !data.expiresOn) throw new DomainError("EXPIRATION_REQUIRED", "Indicá la fecha de vencimiento de esta presentación.", 422);
  if (!policy.expires && data.expiresOn) throw new DomainError("EXPIRATION_NOT_ALLOWED", "La configuración asignada no admite fecha de vencimiento.", 422);
  if (data.issuedOn && data.expiresOn && data.issuedOn > data.expiresOn) {
    throw new DomainError("DATE_ORDER", "El vencimiento no puede ser anterior a la emisión.", 422);
  }
  return { ...data, values: validateDocumentFields(policy.fields, data.values) };
}
