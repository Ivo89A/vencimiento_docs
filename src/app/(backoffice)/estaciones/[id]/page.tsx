import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getStation, listStationHistory } from "@/domains/stations/station.queries";
import { operationalStatusLabels, stationIdSchema } from "@/domains/stations/station.schemas";
import { DomainError } from "@/lib/errors";
import { formatDateTime } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { PermissionNotice } from "@/components/ui/permission-notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResourceActiveButton } from "@/components/shared/resource-active-button";
import { getStationDocumentableId } from "@/domains/documents/document.queries";

export const metadata = { title: "Detalle de estación" };

export default async function StationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string; vista?: string; pagina?: string }>;
}) {
  const actor = await requirePageActor();
  if (!hasPermission(actor, "stations:read")) return <PermissionNotice />;
  const { id } = await params;
  if (!stationIdSchema.safeParse(id).success) notFound();
  let station;
  try { station = await getStation(actor, id); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const query = await searchParams;
  const canWrite = hasPermission(actor, "stations:write");
  const canAudit = hasPermission(actor, "audit:read");
  const documentableId = hasPermission(actor, "documents:read") ? await getStationDocumentableId(actor, id) : undefined;
  const showHistory = query.vista === "historial" && canAudit;
  const page = /^\d+$/.test(query.pagina ?? "") ? Math.min(10000, Math.max(1, Number(query.pagina))) : 1;
  const history = showHistory ? await listStationHistory(actor, id, page) : [];
  const details = [
    ["Código interno", station.code], ["Estado operativo", operationalStatusLabels[station.operationalStatus]],
    ["Dirección", station.address], ["Provincia", station.province], ["Localidad", station.locality],
    ["Responsable", station.responsible], ["Email", station.email || "Sin informar"], ["Teléfono", station.phone || "Sin informar"],
  ];
  const actions: Record<string, string> = { CREATE: "Alta de estación", UPDATE: "Datos actualizados", TRANSFER: "Razón social modificada", ACTIVATE: "Estación activada", DEACTIVATE: "Estación desactivada" };

  return (
    <>
      <Link href="/estaciones" className="mb-6 inline-block text-sm font-medium text-slate-500 hover:text-teal-700">← Estaciones de servicio</Link>
      <PageHeading eyebrow="Perfil de estación" title={station.name} description={station.legalEntity.legalName}
        action={canWrite ? <div className="flex flex-wrap gap-3">
          <ResourceActiveButton id={id} active={station.active} version={station.version} endpoint="/api/stations" resourceLabel="estación"
            deactivateDescription="Los datos y el historial se conservan. Primero deben desactivarse o desvincularse las tiendas activas asociadas." />
          <Button asChild><Link href={`/estaciones/${id}/editar`}><Pencil size={16} />Editar estación</Link></Button>
        </div> : undefined} />
      {query.guardado === "1" ? <p role="status" className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">La estación se guardó correctamente.</p> : null}
      <nav aria-label="Secciones de la estación" className="mb-5 flex flex-wrap gap-5 border-b border-border text-sm [&_a]:min-h-11">
        {documentableId ? <Link className="border-b-2 border-transparent pb-3 text-slate-500" href={`/documentacion?entityId=${documentableId}`}>Documentación</Link> : null}
        <Link href={`/estaciones/${id}`} aria-current={!showHistory ? "page" : undefined} className={`border-b-2 pb-3 ${!showHistory ? "border-teal-700 font-semibold text-teal-700" : "border-transparent text-slate-500"}`}>Resumen</Link>
        {canAudit ? <Link href={`/estaciones/${id}?vista=historial`} aria-current={showHistory ? "page" : undefined} className={`border-b-2 pb-3 ${showHistory ? "border-teal-700 font-semibold text-teal-700" : "border-transparent text-slate-500"}`}>Historial</Link> : null}
      </nav>
      {showHistory ? <section className="surface p-6 md:p-8">
        <h2 className="mb-5 font-semibold">Historial de cambios</h2>
        <ul className="history-list divide-y divide-slate-100">{history.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-4">
          <div><p className="text-sm font-medium">{actions[event.action] ?? event.action}</p><p className="mt-1 text-xs text-slate-500">{event.actor?.name ?? "Sistema"}</p></div>
          <time dateTime={event.createdAt.toISOString()} className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</time>
        </li>)}</ul>
        {history.length === 0 ? <p className="text-sm text-slate-500">No hay más eventos.</p> : null}
        <div className="mt-4 flex gap-4 text-sm font-medium text-teal-700">
          {page > 1 ? <Link href={`?vista=historial&pagina=${page - 1}`}>Anterior</Link> : null}
          {history.length === 20 ? <Link href={`?vista=historial&pagina=${page + 1}`}>Siguiente</Link> : null}
        </div>
      </section> : <section className="surface detail-panel p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5"><h2 className="font-semibold">Datos generales</h2><StatusBadge active={station.active} /></div>
        <dl className="grid gap-6 md:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Razón social</dt><dd className="mt-2 text-sm font-medium">
            {hasPermission(actor, "legal-entities:read") ? <Link className="text-teal-700 hover:underline" href={`/razones-sociales/${station.legalEntityId}`}>{station.legalEntity.legalName}</Link> : station.legalEntity.legalName}
          </dd></div>
          {details.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-2 break-words text-sm font-medium">{value}</dd></div>)}
        </dl>
        <p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">Alta: {formatDateTime(station.createdAt)} · Última actualización: {formatDateTime(station.updatedAt)}</p>
      </section>}
    </>
  );
}
