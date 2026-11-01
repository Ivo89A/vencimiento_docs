import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getDatabase } from "@/infrastructure/database/client";
import { DomainError } from "@/lib/errors";
import type { Actor } from "./access-policy";

export async function getActor(requestHeaders: Headers): Promise<Actor> {
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) throw new DomainError("UNAUTHENTICATED", "Ingresá para continuar.", 401);
  const user = await getDatabase().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, active: true, allEntities: true,
      access: { select: { legalEntityId: true } },
      roles: { select: { role: { select: { permissions: { select: { permissionCode: true } } } } } },
    },
  });
  if (!user?.active) throw new DomainError("UNAUTHENTICATED", "La cuenta no está habilitada.", 401);
  return {
    id: user.id, name: user.name, email: user.email, allEntities: user.allEntities,
    permissions: [...new Set(user.roles.flatMap(({ role }) => role.permissions.map((p) => p.permissionCode)))],
    legalEntityIds: user.access.map((scope) => scope.legalEntityId),
  };
}

export const requirePageActor = cache(async () => {
  try { return await getActor(await headers()); }
  catch (error) {
    if (error instanceof DomainError && error.status === 401) redirect("/ingresar");
    throw error;
  }
});
