import { requirePageActor } from "@/domains/auth/authorization";
import { requirePermission } from "@/domains/auth/access-policy";
import { DomainError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/page-heading";
import { LegalEntityForm } from "@/components/legal-entities/legal-entity-form";

export const metadata = { title: "Nueva razón social" };
export default async function NewLegalEntityPage() {
  const actor = await requirePageActor();
  requirePermission(actor, "legal-entities:write");
  if (!actor.allEntities) throw new DomainError("FORBIDDEN", "Esta operación requiere alcance global.", 403);
  return <><PageHeading eyebrow="Estructura empresarial" title="Nueva razón social" description="Registrá los datos de una empresa del grupo." /><LegalEntityForm /></>;
}
