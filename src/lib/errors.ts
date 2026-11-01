import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";

export class DomainError extends Error {
  constructor(public code: string, message: string, public status: number = 400) {
    super(message);
    this.name = "DomainError";
  }
}

export function publicError(error: unknown) {
  if (error instanceof DomainError) {
    return { code: error.code, message: error.message, status: error.status };
  }
  if (error instanceof ZodError) {
    return { code: "VALIDATION", message: error.issues[0]?.message ?? "Datos inválidos.", status: 422 };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { code: "DUPLICATE", message: "Ya existe un registro con esos datos únicos.", status: 409 };
    if (error.code === "P2003") return { code: "REFERENCE", message: "El registro tiene una relación inválida o dependencias que deben conservarse.", status: 409 };
    if (error.code === "P2025") return { code: "NOT_FOUND", message: "Registro no encontrado o sin acceso.", status: 404 };
    if (error.code === "P2034") return { code: "CONFLICT", message: "Otra operación modificó los datos. Actualizá e intentá nuevamente.", status: 409 };
  }
  // Never log raw error objects: drivers/providers can include connection strings or request data.
  console.error("application_operation_failed", { type: error instanceof Error ? error.name : "UnknownError" });
  return { code: "INTERNAL", message: "No se pudo completar la operación. Verificá la configuración o intentá nuevamente.", status: 500 };
}
