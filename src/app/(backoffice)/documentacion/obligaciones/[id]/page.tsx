import Link from "next/link";
import { notFound } from "next/navigation";
import { z, ZodError } from "zod";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { listDocumentPresentations } from "@/domains/documents/document-presentation.queries";
import { getDocumentableEntity } from "@/domains/documents/document.queries";
import { documentConfigurationSchema } from "@/domains/documents/document.schemas";
import { DomainError } from "@/lib/errors";
import { formatCivilDate } from "@/lib/date";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { PresentationForm } from "@/components/documents/presentation-form";

export const metadata = { title: "Presentaciones de la obligación" };
export default async function PresentationsPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "documents:read")) return <PermissionNotice />;
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  let result;
  try { result = await listDocumentPresentations(actor, id.data, await searchParams); }
  catch (error) { if ((error instanceof DomainError && error.status === 404) || error instanceof ZodError) notFound(); throw error; }
  const entity = await getDocumentableEntity(actor, result.requirement.entityId);
  const fields = documentConfigurationSchema.shape.fields.parse(result.requirement.revision.fields);
  return <>
    <PageHeading title="Presentaciones de la obligación" description={`${result.requirement.revision.name} · ${entity.name}`}
      action={<Button asChild variant="outline"><Link href={`/documentacion?entityId=${entity.id}&requirementId=${id.data}`}>Volver a la obligación</Link></Button>} />
    <section aria-labelledby="presentation-history" className="mb-8">
      <h2 id="presentation-history" className="mb-4 text-lg font-semibold">Historial de presentaciones</h2>
      {result.items.length ? <ul className="flex flex-col gap-3">{result.items.map((item) => <li key={item.id} className="document-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div><Link className="font-semibold text-primary underline underline-offset-4" href={`/documentacion/presentaciones/${item.id}`}>Presentación {item.number}</Link>
          <p className="mt-2 text-sm text-muted-foreground">{item.expiresOn ? `Vencimiento informado: ${formatCivilDate(item.expiresOn)}` : "Sin vencimiento informado"} · Sin evaluación de cumplimiento</p></div>
        <Badge>{item.status === "CANCELLED" ? "Cancelada" : "Borrador sin archivo"}</Badge>
      </li>)}</ul> : <Empty className="surface"><EmptyHeader><EmptyTitle>No hay presentaciones</EmptyTitle><EmptyDescription>Los datos de un borrador no reemplazan un certificado ni acreditan cumplimiento.</EmptyDescription></EmptyHeader></Empty>}
      <footer className="mt-4 flex flex-wrap items-center gap-4 text-sm"><span>{result.total} presentaciones · Página {result.page}</span>
        {result.page > 1 ? <Link className="text-primary underline" href={`?page=${result.page - 1}`}>Anterior</Link> : null}
        {result.page * 20 < result.total ? <Link className="text-primary underline" href={`?page=${result.page + 1}`}>Siguiente</Link> : null}
      </footer>
    </section>
    {hasPermission(actor, "documents:present") && entity.active && result.requirement.documentType.active ? <section aria-labelledby="new-draft">
      <h2 id="new-draft" className="mb-4 text-lg font-semibold">Preparar una presentación</h2>
      <PresentationForm key={result.requirement.version} requirementId={id.data} requirementVersion={result.requirement.version} expires={result.requirement.revision.expires} fields={fields} />
    </section> : !entity.active || !result.requirement.documentType.active ? <p className="text-sm text-muted-foreground">La entidad o el tipo documental están inactivos. Podés consultar las presentaciones existentes.</p> : null}
  </>;
}
