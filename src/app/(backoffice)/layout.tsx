import { ApplicationShell } from "@/components/layout/application-shell";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";

export const dynamic = "force-dynamic";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePageActor();
  return <ApplicationShell name={actor.name} email={actor.email} canReadLegalEntities={hasPermission(actor, "legal-entities:read")} canReadStations={hasPermission(actor, "stations:read")} canReadDocuments={hasPermission(actor, "documents:read")}>{children}</ApplicationShell>;
}
