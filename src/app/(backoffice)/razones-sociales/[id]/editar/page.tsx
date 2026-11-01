import { notFound } from "next/navigation";
import { requirePageActor } from "@/domains/auth/authorization";
import { requirePermission } from "@/domains/auth/access-policy";
import { getLegalEntity } from "@/domains/legal-entities/legal-entity.service";
import { DomainError } from "@/lib/errors";
import { idSchema } from "@/domains/legal-entities/legal-entity.schemas";
import { PageHeading } from "@/components/ui/page-heading";
import { LegalEntityForm } from "@/components/legal-entities/legal-entity-form";

export const metadata = { title: "Editar razón social" };
export default async function EditLegalEntityPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor();
  requirePermission(actor, "legal-entities:write");
  const { id: resourceId } = await params;
  if (!idSchema.safeParse(resourceId).success) notFound();
  let item;
  try { item = await getLegalEntity(actor, resourceId); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const { id, version, legalName, tradeName, cuit, address, province, locality, email, phone, responsible } = item;
  return <><PageHeading eyebrow="Estructura empresarial" title="Editar razón social" description={item.legalName} /><LegalEntityForm initial={{ id, version, legalName, tradeName, cuit, address, province, locality, email, phone, responsible }} /></>;
}
