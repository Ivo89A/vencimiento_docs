import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getDocumentableEntity, listDocumentRequirements } from "@/domains/documents/document.queries";
import { criticalityLabels, documentEntityLabels, documentQuerySchema } from "@/domains/documents/document.schemas";
import { DomainError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Search, FileCheck2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { DocumentSectionNav } from "@/components/documents/document-section-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Documentación" };
export default async function DocumentationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "documents:read")) return <PermissionNotice />;
  const parsed = documentQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const query = parsed.data;
  let entity;
  try { entity = query.entityId ? await getDocumentableEntity(actor, query.entityId) : undefined; }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const result = await listDocumentRequirements(actor, query);
  const href = (page: number) => `/documentacion?${new URLSearchParams({ q: query.q, page: String(page), ...(entity ? { entityId: entity.id } : {}), ...(query.requirementId ? { requirementId: query.requirementId } : {}) })}`;
  return <>
    <PageHeading title="Documentación" description={entity ? `Obligaciones de ${entity.name}` : "Obligaciones documentales dentro de tu alcance autorizado."}
      action={entity && hasPermission(actor, "documents:assign") ? <Button asChild><Link href={`/documentacion/tipos?entityId=${entity.id}`}>Asignar requisito</Link></Button> : undefined} />
    <DocumentSectionNav active="requirements" entityId={entity?.id} />
    <Alert className="mb-6"><Info aria-hidden="true" /><div><AlertTitle>Requisitos y obligaciones</AlertTitle><AlertDescription>La carga privada, revisión de archivos y cálculo de vencimientos todavía no están habilitados. No se informa cumplimiento sin evidencia.</AlertDescription></div></Alert>
    {query.requirementId ? <Link className="mb-5 inline-block text-sm text-teal-700 underline" href={entity ? `/documentacion?entityId=${entity.id}` : "/documentacion"}>Ver todas las obligaciones</Link> : null}
    <form method="get" className="surface mb-6 flex flex-wrap items-end gap-3 p-4"><div className="min-w-0 flex-1"><label htmlFor="requirement-search" className="mb-2 text-xs font-medium text-muted-foreground">Buscar obligación</label><Input id="requirement-search" name="q" type="search" placeholder="Nombre del requisito…" defaultValue={query.q} maxLength={100} /></div>
      {entity ? <input type="hidden" name="entityId" value={entity.id} /> : null}<Button type="submit" variant="outline"><Search aria-hidden="true" />Buscar</Button>
    </form>
    <ul className="flex flex-col gap-4">{result.items.map((item) => <li id={`obligacion-${item.id}`} key={item.id} className="document-card scroll-mt-6 p-5 sm:p-6">
      <h2 className="font-semibold">{item.revision.name}</h2>
      <p className="mt-1 text-sm text-slate-500">{documentEntityLabels[item.entity.kind]}: {item.entity.station?.name ?? item.entity.store?.name ?? item.entity.vehicle?.plate ?? item.entity.company.tradeName}</p>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div><dt className="text-xs text-slate-500">Configuración asignada</dt><dd>{item.documentType.code} · Revisión {item.revision.number}</dd></div>
        <div><dt className="text-xs text-slate-500">Prioridad</dt><dd>{criticalityLabels[item.revision.criticality]} · {item.revision.required ? "Obligatorio" : "Opcional"}</dd></div>
        <div><dt className="text-xs text-slate-500">Documentación</dt><dd><Badge>Pendiente de carga</Badge></dd></div>
      </dl>
      <Button asChild variant="outline" className="mt-4"><Link href={`/documentacion/obligaciones/${item.id}`}>Ver presentaciones</Link></Button>
      {!item.documentType.active ? <p className="mt-3 text-xs text-amber-800">Tipo inactivo para nuevas asignaciones. La obligación se conserva.</p> : null}
    </li>)}</ul>
    {result.total === 0 ? <Empty className="surface"><EmptyHeader><FileCheck2 aria-hidden="true" size={30} className="text-muted-foreground" /><EmptyTitle>No hay obligaciones para mostrar</EmptyTitle><EmptyDescription>{query.q ? "Probá otra búsqueda para encontrar un requisito." : "Consultá los tipos documentales o accedé desde una estación para asignar requisitos. Sin evaluación de cumplimiento."}</EmptyDescription></EmptyHeader></Empty> : null}
    <footer className="mt-5 flex flex-wrap items-center gap-5 text-sm"><span>{result.total} obligaciones · Página {result.page}</span>
      {result.page > 1 ? <Link className="text-teal-700 underline" href={href(result.page - 1)}>Anterior</Link> : null}
      {result.page * 20 < result.total ? <Link className="text-teal-700 underline" href={href(result.page + 1)}>Siguiente</Link> : null}
    </footer>
  </>;
}
