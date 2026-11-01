import { z } from "zod";
import { changeActiveSchema, idSchema } from "@/domains/legal-entities/legal-entity.schemas";

export const operationalStatuses = ["OPERATIONAL", "PAUSED", "CLOSED"] as const;
export const operationalStatusLabels: Record<(typeof operationalStatuses)[number], string> = {
  OPERATIONAL: "Operativa",
  PAUSED: "Temporalmente fuera de servicio",
  CLOSED: "Cerrada",
};

const text = z.string().trim().min(1, "Completá este campo.").max(200, "Máximo 200 caracteres.");

export const stationSchema = z.object({
  name: text,
  code: z.string().trim().min(1, "Ingresá un código interno.").max(50).toUpperCase(),
  legalEntityId: z.uuid("Seleccioná una razón social válida."),
  operationalStatus: z.enum(operationalStatuses),
  address: text,
  province: text,
  locality: text,
  responsible: text,
  phone: z.string().trim().max(50),
  email: z.union([z.literal(""), z.email("Ingresá un email válido.").max(254)]),
}).strict();

export const updateStationSchema = stationSchema.extend({ version: z.number().int().min(1) }).strict();
export const stationActiveSchema = changeActiveSchema;
export const stationIdSchema = idSchema;

export const stationQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  legalEntityId: z.preprocess((value) => value === "" ? undefined : value, idSchema.optional()),
  active: z.enum(["true", "false", "all"]).default("true"),
  operationalStatus: z.preprocess((value) => value === "" ? undefined : value, z.enum(operationalStatuses).optional()),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["name", "code", "createdAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
}).strict();

export const companyOptionQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  active: z.enum(["true", "all"]).default("true"),
}).strict();

export type StationInput = z.input<typeof stationSchema>;
export type StationData = z.output<typeof stationSchema>;
export type StationQuery = z.output<typeof stationQuerySchema>;
