import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { DocumentTypeForm } from "@/components/documents/document-type-form";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDocumentableEntity } from "@/domains/documents/document.queries";
import { DomainError } from "@/lib/errors";

export const metadata = { title: "Nuevo tipo documental" };
export default async function NewDocumentTypePage({ searchParams }: { searchParams: Promise<{ entityId?: string }> }) {
  const actor = await requirePageActor();
  if (!actor.allEntities || !hasPermission(actor, "documents:configure")) return <PermissionNotice />;
  const parsed = z.object({ entityId: z.uuid().optional() }).safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { entityId } = parsed.data;
  try { if (entityId) await getDocumentableEntity(actor, entityId); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  return <><PageHeading title="Nuevo tipo documental" description="Definí el requisito y a qué entidades se puede asignar." /><DocumentTypeForm entityId={entityId} /></>;
}
