import Link from "next/link";
import { ArrowRight, Building2, FileCheck2, Fuel, ShieldCheck } from "lucide-react";
import { requirePageActor } from "@/domains/auth/authorization";
import { childEntityScope, hasPermission, legalEntityScope } from "@/domains/auth/access-policy";
import { getDatabase } from "@/infrastructure/database/client";
import { PageHeading } from "@/components/ui/page-heading";

export const metadata = { title: "Inicio" };

export default async function StartPage() {
  const actor = await requirePageActor();
  const canRead = hasPermission(actor, "legal-entities:read");
  const canReadStations = hasPermission(actor, "stations:read");
  const canReadDocuments = hasPermission(actor, "documents:read");
  const [count, stationCount] = await Promise.all([
    canRead ? getDatabase().legalEntity.count({ where: { ...legalEntityScope(actor), active: true } }) : null,
    canReadStations ? getDatabase().serviceStation.count({ where: { ...childEntityScope(actor), active: true } }) : null,
  ]);
  return <>
    <PageHeading eyebrow="Tu espacio de trabajo" title={`Hola, ${actor.name.split(" ")[0]}`} description="Accedé a la información empresarial habilitada para tu cuenta." />
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_19rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="surface overflow-hidden" aria-labelledby="resumen-title">
          <div className="border-b border-border px-6 py-5"><h2 id="resumen-title" className="font-semibold">Tu estructura empresarial</h2><p className="mt-1 text-xs text-muted-foreground">Registros activos dentro de tu alcance de acceso</p></div>
          <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {canRead ? <Link href="/razones-sociales" className="group p-6 transition-colors hover:bg-muted/50"><Building2 size={20} aria-hidden="true" className="text-primary" /><p className="mt-5 text-5xl font-semibold tracking-[-.06em] tabular-nums">{new Intl.NumberFormat("es-AR").format(count ?? 0)}</p><h3 className="mt-3 text-sm font-medium">Razones sociales activas</h3><span className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">Consultar empresas<ArrowRight size={15} aria-hidden="true" /></span></Link> : null}
            {canReadStations ? <Link href="/estaciones" className="group p-6 transition-colors hover:bg-muted/50"><Fuel size={20} aria-hidden="true" className="text-primary" /><p className="mt-5 text-5xl font-semibold tracking-[-.06em] tabular-nums">{new Intl.NumberFormat("es-AR").format(stationCount ?? 0)}</p><h3 className="mt-3 text-sm font-medium">Estaciones activas</h3><span className="mt-5 flex items-center gap-2 text-xs font-semibold text-primary">Consultar estaciones<ArrowRight size={15} aria-hidden="true" /></span></Link> : null}
            {!canRead && !canReadStations ? <p className="p-6 text-sm text-muted-foreground sm:col-span-2">No tenés habilitada la consulta de empresas o estaciones. Solicitá al administrador los permisos que necesitás.</p> : null}
          </div>
        </section>
        {canReadDocuments ? <section className="surface p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-lg"><FileCheck2 size={24} aria-hidden="true" className="mb-4 text-primary" /><h2 className="text-xl font-semibold tracking-tight">Organizá las obligaciones documentales</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Consultá los requisitos asignados a cada entidad y la configuración de los tipos documentales.</p></div></div><div className="mt-6 flex flex-wrap gap-3"><Link href="/documentacion" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">Ver obligaciones<ArrowRight size={16} aria-hidden="true" /></Link><Link href="/documentacion/tipos" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Explorar catálogo</Link></div><p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">La carga de archivos y la evaluación de vencimientos aún no están habilitadas. No se informa cumplimiento sin evidencia.</p></section> : null}
      </div>
      <section className="border-t-2 border-primary pt-5"><ShieldCheck className="text-primary" size={23} aria-hidden="true" /><h2 className="mt-4 font-semibold">Tu acceso</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{actor.allEntities ? "Tenés alcance sobre todas las razones sociales del grupo. Las operaciones habilitadas dependen de tus permisos." : "Solo podés consultar las razones sociales que te asignaron. Si falta una empresa, solicitá su asignación al administrador."}</p><p className="mt-5 break-all border-t border-border pt-4 text-xs text-muted-foreground">{actor.email}</p><div className="mt-8 rounded-xl bg-[#e5eeed] p-4"><h3 className="text-xs font-semibold text-primary">Datos con contexto</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">El estado operativo de una estación y su cumplimiento documental son conceptos diferentes.</p></div></section>
    </div>
  </>;
}
