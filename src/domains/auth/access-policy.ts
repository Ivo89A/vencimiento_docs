import { DomainError } from "@/lib/errors";

export const permissions = [
  "legal-entities:read", "legal-entities:write", "legal-entities:export",
  "stations:read", "stations:write", "stations:export", "stores:read", "stores:write",
  "vehicles:read", "vehicles:write", "audit:read",
  "documents:read", "documents:configure", "documents:assign", "documents:present",
] as const;
export type PermissionCode = (typeof permissions)[number];

export type Actor = {
  id: string;
  name: string;
  email: string;
  allEntities: boolean;
  permissions: readonly string[];
  legalEntityIds: readonly string[];
};

export function hasPermission(actor: Actor, permission: PermissionCode) {
  return actor.permissions.includes(permission);
}

export function requirePermission(actor: Actor, permission: PermissionCode) {
  if (!hasPermission(actor, permission)) throw new DomainError("FORBIDDEN", "No tenés permiso para realizar esta operación.", 403);
}

export function canAccessLegalEntity(actor: Actor, legalEntityId: string) {
  return actor.allEntities || actor.legalEntityIds.includes(legalEntityId);
}

export function requireLegalEntityAccess(actor: Actor, legalEntityId: string) {
  if (!canAccessLegalEntity(actor, legalEntityId)) throw new DomainError("NOT_FOUND", "Registro no encontrado o sin acceso.", 404);
}

export function legalEntityScope(actor: Actor) {
  return actor.allEntities ? {} : { id: { in: [...actor.legalEntityIds] } };
}

export function childEntityScope(actor: Actor) {
  return actor.allEntities ? {} : { legalEntityId: { in: [...actor.legalEntityIds] } };
}
