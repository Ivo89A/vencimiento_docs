import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getDocumentTypeForConfiguration } from "@/domains/documents/document-type.service";
import { DomainError } from "@/lib/errors";
import { documentConfigurationSchema } from "@/domains/documents/document.schemas";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { DocumentTypeForm } from "@/components/documents/document-type-form";
import { getDocumentableEntity } from "@/domains/documents/document.queries";

export const metadata = { title: "Revisar tipo documental" };
export default async function EditDocumentTypePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ entityId?: string }> }) {
  const actor = await requirePageActor();
  if (!actor.allEntities || !hasPermission(actor, "documents:configure")) return <PermissionNotice />;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const parsed = z.object({ entityId: z.uuid().optional() }).safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { entityId } = parsed.data;
  let type;
  try {
    if (entityId) await getDocumentableEntity(actor, entityId);
    type = await getDocumentTypeForConfiguration(actor, id);
  }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const { id: revisionId, number, ...configuration } = type.revisions[0];
  void revisionId; void number;
  return <><PageHeading title="Revisar tipo documental" description="Se creará una nueva revisión sin modificar las obligaciones ya asignadas." />
    <DocumentTypeForm entityId={entityId} initial={{ ...documentConfigurationSchema.parse(configuration), id, code: type.code, version: type.version }} />
  </>;
}
