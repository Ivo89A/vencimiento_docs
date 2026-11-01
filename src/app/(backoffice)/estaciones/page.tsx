import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Fuel, Plus } from "lucide-react";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getStationCompanyOption, listStations } from "@/domains/stations/station.queries";
import { operationalStatuses, operationalStatusLabels, stationQuerySchema } from "@/domains/stations/station.schemas";
import { DomainError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CsvExportForm } from "@/components/shared/csv-export-form";
import { StationCompanyFilter } from "@/components/stations/station-company-picker";
import { StationTable } from "@/components/stations/station-table";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export const metadata = { title: "Estaciones de servicio" };

export default async function StationsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "stations:read")) return <PermissionNotice />;
  const raw = await searchParams;
  const keys = ["q", "legalEntityId", "active", "operationalStatus", "page", "pageSize", "sort", "order"];
  const parsed = stationQuerySchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([key]) => keys.includes(key))));
  const query = parsed.success ? parsed.data : stationQuerySchema.parse({});
  const queryKey = JSON.stringify(query);
  let company;
  try { company = query.legalEntityId ? await getStationCompanyOption(actor, query.legalEntityId) : undefined; }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const result = await listStations(actor, query);
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const canWrite = hasPermission(actor, "stations:write");
  const canExport = hasPermission(actor, "stations:export");
  const href = (changes: Record<string, string | number>) => `/estaciones?${new URLSearchParams(
    Object.fromEntries(Object.entries({ ...query, ...changes }).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])),
  )}`;
  if (query.page > pages) redirect(href({ page: pages }));
  const sortHref = (sort: "name" | "code") => href({ sort, order: query.sort === sort && query.order === "asc" ? "desc" : "asc", page: 1 });

  return (
    <>
      <PageHeading eyebrow="Estructura empresarial" title="Estaciones de servicio"
        description="Datos, responsables y estado operativo de las estaciones del grupo."
        action={<div className="flex flex-wrap gap-3">
          {canExport ? <CsvExportForm key={queryKey} query={query} endpoint="/api/stations/export" formId="export-stations" filename="estaciones.csv" /> : null}
          {canWrite ? <Button asChild><Link href={company?.active ? `/estaciones/nueva?legalEntityId=${company.id}` : "/estaciones/nueva"}><Plus size={17} />Nueva estación</Link></Button> : null}
        </div>} />
      {!parsed.success ? <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Los filtros no eran válidos. Se restableció la búsqueda.</p> : null}
      <section className="surface overflow-hidden">
        <form method="get" className="filter-bar">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><label htmlFor="q" className="mb-2 text-sm font-medium text-slate-700">Buscar estación</label>
              <Input id="q" name="q" defaultValue={query.q} maxLength={100} placeholder="Nombre, código o localidad" /></div>
            <StationCompanyFilter key={queryKey} initialOption={company} />
            <div><label htmlFor="active" className="mb-2 text-sm font-medium text-slate-700">Estado del registro</label>
              <select id="active" name="active" defaultValue={query.active} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                <option value="true">Activas</option><option value="false">Inactivas</option><option value="all">Todas</option>
              </select></div>
            <div><label htmlFor="operationalStatus" className="mb-2 text-sm font-medium text-slate-700">Estado operativo</label>
              <select id="operationalStatus" name="operationalStatus" defaultValue={query.operationalStatus ?? ""} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm">
                <option value="">Todos</option>{operationalStatuses.map((value) => <option key={value} value={value}>{operationalStatusLabels[value]}</option>)}
              </select></div>
          </div>
          <input type="hidden" name="sort" value={query.sort} /><input type="hidden" name="order" value={query.order} />
          <div className="mt-4 flex gap-3"><Button type="submit" variant="outline">Aplicar filtros</Button><Button asChild variant="ghost"><Link href="/estaciones">Limpiar</Link></Button></div>
        </form>
        {result.total > 0 ? <>
          {canExport ? <p className="border-b border-slate-100 px-6 py-3 text-xs leading-5 text-slate-500">Seleccioná filas de esta página para exportarlas. Sin selección se exporta todo el filtro, hasta 5000 estaciones.</p> : null}
          <StationTable key={queryKey} items={result.items} canExport={canExport} nameSortHref={sortHref("name")} codeSortHref={sortHref("code")} />
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <p className="text-xs text-slate-500">{result.total} {result.total === 1 ? "estación" : "estaciones"} · Página {result.page} de {pages}</p>
            <div className="flex gap-2">
              {result.page > 1 ? <Button variant="outline" asChild><Link href={href({ page: result.page - 1 })}><ChevronLeft size={15} />Anterior</Link></Button> : null}
              {result.page < pages ? <Button variant="outline" asChild><Link href={href({ page: result.page + 1 })}>Siguiente<ChevronRight size={15} /></Link></Button> : null}
            </div>
          </footer>
        </> : <Empty><EmptyHeader>
          <Fuel size={32} aria-hidden="true" className="text-muted-foreground" /><EmptyTitle>No hay estaciones para mostrar</EmptyTitle>
          <EmptyDescription>Probá otros filtros o verificá tus asignaciones. Para crear una estación necesitás una razón social activa.</EmptyDescription>
        </EmptyHeader></Empty>}
      </section>
    </>
  );
}
