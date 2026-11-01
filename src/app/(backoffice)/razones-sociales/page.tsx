import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { listLegalEntities } from "@/domains/legal-entities/legal-entity.service";
import { legalEntityQuerySchema } from "@/domains/legal-entities/legal-entity.schemas";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalEntityTable } from "@/components/legal-entities/legal-entity-table";
import { ExportCsvForm } from "@/components/legal-entities/export-csv-form";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export const metadata = { title: "Razones sociales" };

export default async function LegalEntitiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor();
  const raw = await searchParams;
  const allowedKeys = ["q", "active", "page", "pageSize", "sort", "order"];
  const parsed = legalEntityQuerySchema.safeParse(
    Object.fromEntries(Object.entries(raw).filter(([key]) => allowedKeys.includes(key))),
  );
  const query = parsed.success ? parsed.data : legalEntityQuerySchema.parse({});
  const queryKey = JSON.stringify(query);
  const result = await listLegalEntities(actor, query);
  const canCreate = actor.allEntities && hasPermission(actor, "legal-entities:write");
  const canExport = hasPermission(actor, "legal-entities:export");
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const href = (changes: Record<string, string | number>) => {
    const values = { ...query, ...changes };
    return `/razones-sociales?${new URLSearchParams(
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])),
    )}`;
  };
  if (query.page > pages) redirect(href({ page: pages }));

  return (
    <>
      <PageHeading
        eyebrow="Estructura empresarial"
        title="Razones sociales"
        description="Datos, responsables y estado de las empresas del grupo."
        action={
          <div className="flex flex-wrap gap-3">
            {canExport ? <ExportCsvForm key={queryKey} query={query} /> : null}
            {canCreate ? (
              <Button asChild>
                <Link href="/razones-sociales/nueva"><Plus size={17} />Nueva razón social</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      {!parsed.success ? (
        <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Los filtros no eran válidos. Se restableció la búsqueda.
        </p>
      ) : null}
      <section className="surface overflow-hidden">
        <form className="filter-bar flex flex-wrap items-end gap-3" method="get">
          <div className="min-w-48 flex-1">
            <label className="mb-1.5 text-xs font-medium text-slate-500" htmlFor="q">Buscar empresa</label>
            <div className="relative">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" />
              <Input className="pl-10" id="q" name="q" defaultValue={query.q} maxLength={100} placeholder="Nombre legal, comercial o CUIT" />
            </div>
          </div>
          <div>
            <label htmlFor="active" className="mb-1.5 text-xs font-medium text-slate-500">Estado</label>
            <select id="active" name="active" defaultValue={query.active} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">
              <option value="true">Activas</option><option value="false">Inactivas</option><option value="all">Todas</option>
            </select>
          </div>
          <input type="hidden" name="sort" value={query.sort} />
          <input type="hidden" name="order" value={query.order} />
          <Button variant="outline" type="submit">Aplicar</Button>
          {query.q || query.active !== "true" ? (
            <Button variant="ghost" asChild><Link href="/razones-sociales">Limpiar</Link></Button>
          ) : null}
        </form>
        {canExport && result.total > 0 ? (
          <p className="border-b border-slate-100 px-6 py-3 text-xs leading-5 text-slate-500">
            Seleccioná filas de esta página para exportarlas. Sin selección se exportan todas las empresas del filtro, hasta 5000 registros.
          </p>
        ) : null}
        {result.total > 0 ? (
          <>
            <LegalEntityTable
              key={queryKey}
              items={result.items.map(({ id, legalName, tradeName, cuit, locality, province, responsible, active }) => ({ id, legalName, tradeName, cuit, locality, province, responsible, active }))}
              canExport={canExport}
              sortHref={href({ sort: "legalName", order: query.sort === "legalName" && query.order === "asc" ? "desc" : "asc", page: 1 })}
            />
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-500">
                {result.total} {result.total === 1 ? "empresa" : "empresas"} · Página {result.page} de {pages}
              </p>
              <div className="flex items-center gap-2">
                {result.page > 1 ? (
                  <Button variant="outline" asChild><Link href={href({ page: result.page - 1 })}><ChevronLeft size={15} />Anterior</Link></Button>
                ) : null}
                {result.page < pages ? (
                  <Button variant="outline" asChild><Link href={href({ page: result.page + 1 })}>Siguiente<ChevronRight size={15} /></Link></Button>
                ) : null}
              </div>
            </footer>
          </>
        ) : (
          <Empty><EmptyHeader>
            <Building2 className="mb-1 text-muted-foreground" size={32} aria-hidden="true" />
            <EmptyTitle>No hay empresas para mostrar</EmptyTitle>
            <EmptyDescription>
              {query.q ? "Probá con otra búsqueda o cambiá los filtros." : canCreate
                ? "Registrá la primera razón social para comenzar."
                : "No hay razones sociales que coincidan con tus filtros y asignaciones."}
            </EmptyDescription>
          </EmptyHeader></Empty>
        )}
      </section>
    </>
  );
}
