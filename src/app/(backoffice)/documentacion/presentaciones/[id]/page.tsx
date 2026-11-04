import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getDocumentPresentation } from "@/domains/documents/document-presentation.queries";
import { getDocumentableEntity } from "@/domains/documents/document.queries";
import { documentConfigurationSchema } from "@/domains/documents/document.schemas";
import { DomainError } from "@/lib/errors";
import { formatCivilDate } from "@/lib/date";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PresentationForm } from "@/components/documents/presentation-form";
import { CancelPresentationButton } from "@/components/documents/cancel-presentation-button";

export const metadata = { title: "Detalle de presentación" };
export default async function PresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "documents:read")) return <PermissionNotice />;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  let item;
  try { item = await getDocumentPresentation(actor, id.data); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const entity = await getDocumentableEntity(actor, item.requirement.entityId);
  const fields = documentConfigurationSchema.shape.fields.parse(item.revision.fields);
  const values = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).parse(item.values);
  const canCancel = hasPermission(actor, "documents:present") && item.status === "DRAFT";
  const canEdit = canCancel && entity.active && item.requirement.documentType.active;
  return <>
    <PageHeading title={`Presentación ${item.number}`} description={`${item.revision.name} · ${entity.name}`}
      action={<Button asChild variant="outline"><Link href={`/documentacion/obligaciones/${item.requirementId}`}>Volver a presentaciones</Link></Button>} />
    <div className="mb-5 flex flex-wrap items-center gap-3"><Badge>{item.status === "CANCELLED" ? "Cancelada" : "Borrador sin archivo"}</Badge><p className="text-sm text-muted-foreground">Sin evaluación de cumplimiento</p></div>
    {canEdit ? <>
      <PresentationForm key={item.version} requirementId={item.requirementId} requirementVersion={0} expires={item.revision.expires} fields={fields}
        initial={{ id: item.id, version: item.version, issuedOn: item.issuedOn, expiresOn: item.expiresOn, values, notes: item.notes }} />
    </> : <section className="surface p-6" aria-label="Datos de la presentación">
      <dl className="grid gap-5 sm:grid-cols-2">
        <div><dt className="text-sm text-muted-foreground">Fecha de emisión</dt><dd>{item.issuedOn ? formatCivilDate(item.issuedOn) : "Sin informar"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Fecha de vencimiento</dt><dd>{item.expiresOn ? formatCivilDate(item.expiresOn) : "Sin informar"}</dd></div>
        {fields.map((field) => <div key={field.key}><dt className="text-sm text-muted-foreground">{field.label}</dt><dd className="whitespace-pre-wrap break-words">{values[field.key] === undefined ? "Sin informar" : typeof values[field.key] === "boolean" ? values[field.key] ? "Sí" : "No" : String(values[field.key])}</dd></div>)}
        <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Observaciones</dt><dd className="whitespace-pre-wrap break-words">{item.notes || "Sin observaciones"}</dd></div>
      </dl>
    </section>}
    {canCancel ? <CancelPresentationButton key={`cancel-${item.version}`} id={item.id} version={item.version} /> : null}
  </>;
}
