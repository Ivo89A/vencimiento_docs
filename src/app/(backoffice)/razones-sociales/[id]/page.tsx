import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePageActor } from "@/domains/auth/authorization";
import { hasPermission } from "@/domains/auth/access-policy";
import { getLegalEntity, listLegalEntityHistory } from "@/domains/legal-entities/legal-entity.service";
import { DomainError } from "@/lib/errors";
import { formatDateTime } from "@/lib/date";
import { idSchema } from "@/domains/legal-entities/legal-entity.schemas";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChangeActiveButton } from "@/components/legal-entities/change-active-button";

export const metadata = { title: "Detalle de razón social" };
export default async function LegalEntityDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ guardado?: string; historial?: string }> }) {
  const actor = await requirePageActor();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const query = await searchParams;
  let item;
  try { item = await getLegalEntity(actor, id); }
  catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const canEdit = hasPermission(actor, "legal-entities:write");
  const canReadHistory = hasPermission(actor, "audit:read");
  const historyPage = /^\d+$/.test(query.historial ?? "") ? Math.max(1, Math.min(10000, Number(query.historial))) : 1;
  const history = canReadHistory ? await listLegalEntityHistory(actor, id, historyPage) : [];
  const details = [
    ["Nombre legal", item.legalName], ["Nombre comercial", item.tradeName], ["CUIT", `${item.cuit.slice(0, 2)}-${item.cuit.slice(2, 10)}-${item.cuit.slice(10)}`], ["Responsable", item.responsible],
    ["Domicilio", item.address], ["Provincia", item.province], ["Localidad", item.locality], ["Email", item.email || "Sin informar"], ["Teléfono", item.phone || "Sin informar"],
  ];
  const formatDate = formatDateTime;
  const actions: Record<string, string> = { CREATE: "Alta de razón social", UPDATE: "Datos actualizados", ACTIVATE: "Empresa activada", DEACTIVATE: "Empresa desactivada" };
  return <>
    <Link href="/razones-sociales" className="mb-6 inline-block text-sm font-medium text-slate-500 hover:text-teal-700">← Razones sociales</Link>
    <PageHeading eyebrow="Perfil de empresa" title={item.tradeName} description={item.legalName} action={canEdit ? <div className="flex gap-3"><ChangeActiveButton id={item.id} active={item.active} version={item.version} /><Button asChild><Link href={`/razones-sociales/${id}/editar`}><Pencil size={16} />Editar datos</Link></Button></div> : undefined} />
    {query.guardado === "1" ? <p role="status" className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">Los datos se guardaron correctamente.</p> : null}
    {hasPermission(actor, "stations:read") ? <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <div><h2 className="font-semibold">Estaciones de esta empresa</h2><p className="mt-1 text-sm text-slate-500">Consultá los registros asociados a esta razón social.</p></div>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link href={`/estaciones?legalEntityId=${id}`}>Ver estaciones</Link></Button>
        {item.active && hasPermission(actor, "stations:write") ? <Button asChild><Link href={`/estaciones/nueva?legalEntityId=${id}`}>Crear estación</Link></Button> : null}
      </div>
    </section> : null}
    <section className="surface detail-panel p-6 md:p-8"><div className="mb-6 flex items-center justify-between border-b border-border pb-5"><h2 className="font-semibold">Datos generales</h2><StatusBadge active={item.active} /></div><dl className="grid gap-x-6 gap-y-3 md:grid-cols-3">{details.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm font-medium">{value}</dd></div>)}</dl><p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">Alta: {formatDate(item.createdAt)} · Última actualización: {formatDate(item.updatedAt)}</p></section>
    {canReadHistory ? <section className="surface mt-6 p-6 md:p-8"><h2 className="mb-5 font-semibold">Historial de cambios</h2><ul className="history-list divide-y divide-border">{history.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-4"><div><p className="text-sm font-medium">{actions[event.action] ?? event.action}</p><p className="mt-1 text-xs text-muted-foreground">{event.actor?.name ?? "Sistema"}</p></div><time dateTime={event.createdAt.toISOString()} className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</time></li>)}</ul>{history.length === 0 ? <p className="text-sm text-muted-foreground">No hay más eventos.</p> : null}<div className="mt-4 flex gap-4 text-sm font-medium text-primary">{historyPage > 1 ? <Link href={`?historial=${historyPage - 1}`}>Anterior</Link> : null}{history.length === 20 ? <Link href={`?historial=${historyPage + 1}`}>Siguiente</Link> : null}</div></section> : null}
  </>;
}
