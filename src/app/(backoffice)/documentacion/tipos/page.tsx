import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getDocumentableEntity, listDocumentTypes } from "@/domains/documents/document.queries";
import { criticalityLabels, documentEntityLabels } from "@/domains/documents/document.schemas";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AssignDocumentButton } from "@/components/documents/assign-document-button";
import { ResourceActiveButton } from "@/components/shared/resource-active-button";
import { DomainError } from "@/lib/errors";
import { Search } from "lucide-react";
import { DocumentSectionNav } from "@/components/documents/document-section-nav";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export const metadata = { title: "Tipos documentales" };
export default async function DocumentTypesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; entityId?: string; guardado?: string }> }) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "documents:read")) return <PermissionNotice />;
  const raw = await searchParams;
  const parsed = z.object({ q: z.string().max(100).default(""), page: z.coerce.number().int().min(1).max(10000).default(1), entityId: z.uuid().optional() }).safeParse(raw);
  if (!parsed.success) notFound();
  const query = parsed.data;
  let entity;
  try { entity = query.entityId ? await getDocumentableEntity(actor, query.entityId) : undefined; }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const result = await listDocumentTypes(actor, query);
  const canConfigure = actor.allEntities && hasPermission(actor, "documents:configure");
  const href = (page: number) => `/documentacion/tipos?${new URLSearchParams({ q: query.q, page: String(page), ...(entity ? { entityId: entity.id } : {}) })}`;
  return <>
    <PageHeading title="Tipos documentales" description={entity ? `Elegí un requisito para ${entity.name}.` : "Catálogo común con reglas de aplicación y configuración versionada."}
      action={canConfigure ? <Button asChild><Link href={entity ? `/documentacion/tipos/nuevo?entityId=${entity.id}` : "/documentacion/tipos/nuevo"}>Nuevo tipo documental</Link></Button> : undefined} />
    <DocumentSectionNav active="types" entityId={entity?.id} />
    {raw.guardado === "1" ? <p role="status" className="mb-5 rounded-lg bg-teal-50 p-3 text-sm text-teal-800">Configuración guardada.</p> : null}
    <form className="surface mb-6 flex flex-wrap items-end gap-3 p-4" method="get"><div className="min-w-0 flex-1"><label htmlFor="type-search" className="mb-2 text-xs font-medium text-muted-foreground">Buscar tipo documental</label><Input id="type-search" name="q" placeholder="Código o nombre del tipo…" defaultValue={query.q} maxLength={100} /></div>
      {entity ? <input type="hidden" name="entityId" value={entity.id} /> : null}<Button type="submit" variant="outline"><Search aria-hidden="true" />Buscar</Button>
    </form>
    <ul className="flex flex-col gap-4">{result.items.map((type) => {
      const revision = type.revisions[0];
      if (!revision) return null;
      return <li key={type.id} className="document-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{revision.name}</h2><p className="mt-1 text-xs text-slate-500">{type.code} · Revisión {revision.number} · {type.active ? "Activo" : "Inactivo"}</p></div>
          {canConfigure ? <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`/documentacion/tipos/${type.id}/editar${entity ? `?entityId=${entity.id}` : ""}`}>Editar configuración</Link></Button>
            <ResourceActiveButton id={type.id} active={type.active} version={type.version} endpoint="/api/document-types" resourceLabel="tipo documental" deactivateDescription="No se permitirán nuevas asignaciones. Las obligaciones existentes y su configuración se conservan." />
          </div> : null}
        </div>
        <p className="mt-4 break-words text-sm text-slate-600">{revision.description}</p>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Aplicación</dt><dd>{revision.appliesTo.map((kind) => documentEntityLabels[kind]).join(", ")}</dd></div>
          <div><dt className="text-xs text-slate-500">Prioridad</dt><dd>{criticalityLabels[revision.criticality]} · {revision.required ? "Obligatorio" : "Opcional"}</dd></div>
          <div><dt className="text-xs text-slate-500">Vencimiento</dt><dd>{revision.expires ? `Aviso previo: ${revision.warningDays} días` : "Sin vencimiento"}</dd></div>
        </dl>
        {entity && type.assignedRequirementId ? <p className="mt-5 text-sm text-teal-800">Ya asignado · <Link className="underline" href={`/documentacion?entityId=${entity.id}&requirementId=${type.assignedRequirementId}#obligacion-${type.assignedRequirementId}`}>Ver obligación</Link></p>
          : entity && entity.active && type.active && revision.appliesTo.includes(entity.kind) && hasPermission(actor, "documents:assign") ? <div className="mt-5"><AssignDocumentButton entityId={entity.id} documentTypeId={type.id} typeVersion={type.version} /></div> : null}
      </li>;
    })}</ul>
    {result.total === 0 ? <Empty className="surface"><EmptyHeader><EmptyTitle>No hay tipos documentales para esta búsqueda.</EmptyTitle><EmptyDescription>Probá otro código o nombre.{canConfigure ? " También podés crear un tipo documental con sus reglas de aplicación." : " El catálogo disponible depende de tus permisos."}</EmptyDescription></EmptyHeader></Empty> : null}
    <footer className="mt-5 flex flex-wrap items-center gap-5 text-sm"><span>{result.total} tipos · Página {result.page}</span>
      {result.page > 1 ? <Link className="text-teal-700 underline" href={href(result.page - 1)}>Anterior</Link> : null}
      {result.page * 20 < result.total ? <Link className="text-teal-700 underline" href={href(result.page + 1)}>Siguiente</Link> : null}
    </footer>
  </>;
}
