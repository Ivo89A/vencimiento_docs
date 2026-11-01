"use client";

import Link from "next/link";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { ArrowDownUp } from "lucide-react";
import type { StationListItem } from "@/domains/stations/station.types";
import { operationalStatusLabels } from "@/domains/stations/station.schemas";
import { StatusBadge } from "@/components/ui/status-badge";

export function StationTable({ items, canExport, nameSortHref, codeSortHref }: {
  items: StationListItem[]; canExport: boolean; nameSortHref: string; codeSortHref: string;
}) {
  const isMobile = useMobileViewport();
  if (isMobile) return (
    <div className="p-4">
      <nav aria-label="Ordenar estaciones" className="mb-4 flex flex-wrap gap-4 text-xs font-semibold text-teal-700">
        <Link className="inline-flex min-h-10 items-center gap-1" href={nameSortHref}>Ordenar por nombre<ArrowDownUp size={13} /></Link>
        <Link className="inline-flex min-h-10 items-center gap-1" href={codeSortHref}>Ordenar por código<ArrowDownUp size={13} /></Link>
      </nav>
      <ul aria-label="Estaciones autorizadas" className="flex flex-col gap-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/estaciones/${item.id}`} className="min-w-0 break-words text-sm font-semibold text-slate-900 hover:text-teal-700">{item.name}</Link>
              <StatusBadge active={item.active} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="min-w-0"><dt className="text-slate-500">Código</dt><dd className="mt-1 break-words font-mono">{item.code}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Empresa</dt><dd className="mt-1 break-words">{item.legalEntity.tradeName}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Ubicación</dt><dd className="mt-1 break-words">{item.locality}, {item.province}</dd></div>
              <div className="min-w-0"><dt className="text-slate-500">Responsable</dt><dd className="mt-1 break-words">{item.responsible}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Estado operativo</dt><dd className="mt-1">{operationalStatusLabels[item.operationalStatus]}</dd></div>
            </dl>
            {canExport ? <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 border-t border-slate-100 pt-2 text-sm text-slate-600">
              <input type="checkbox" name="ids" value={item.id} form="export-stations" className="size-5 shrink-0 accent-teal-700"
                aria-label={`Seleccionar ${item.name}`} />Seleccionar para CSV
            </label> : null}
            <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal-700" href={`/estaciones/${item.id}`}>
              Ver detalle<span className="sr-only"> de {item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de estaciones, desplazamiento horizontal disponible">
      <table className="data-table w-full min-w-[1080px] text-left text-sm">
        <caption className="sr-only">Estaciones autorizadas</caption>
        <thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
          <tr>
            {canExport ? <th className="px-4 py-4"><span className="sr-only">Selección</span></th> : null}
            <th className="px-5 py-4"><Link className="inline-flex items-center gap-2" href={nameSortHref}>Estación<ArrowDownUp size={13} /></Link></th>
            <th className="px-5 py-4"><Link className="inline-flex items-center gap-2" href={codeSortHref}>Código<ArrowDownUp size={13} /></Link></th>
            <th className="px-5 py-4">Razón social</th>
            <th className="px-5 py-4">Ubicación</th>
            <th className="px-5 py-4">Operación</th>
            <th className="px-5 py-4">Registro</th>
            <th className="px-5 py-4"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60">
              {canExport ? <td className="px-4 py-5"><input className="size-4 accent-teal-700" type="checkbox" name="ids"
                value={item.id} form="export-stations" aria-label={`Seleccionar ${item.name}`} /></td> : null}
              <td className="px-5 py-5"><Link href={`/estaciones/${item.id}`} className="font-semibold text-slate-800 hover:text-teal-700">{item.name}</Link>
                <p className="mt-1 text-xs text-slate-500">{item.responsible}</p></td>
              <td className="px-5 py-5 font-mono text-xs">{item.code}</td>
              <td className="px-5 py-5 text-slate-600">{item.legalEntity.tradeName}</td>
              <td className="px-5 py-5 text-slate-500">{item.locality}<span className="mt-1 block text-xs">{item.province}</span></td>
              <td className="px-5 py-5 text-xs text-slate-600">{operationalStatusLabels[item.operationalStatus]}</td>
              <td className="px-5 py-5"><StatusBadge active={item.active} /></td>
              <td className="px-5 py-5"><Link className="whitespace-nowrap font-semibold text-teal-700 hover:underline" href={`/estaciones/${item.id}`}>
                Ver detalle<span className="sr-only"> de {item.name}</span>
              </Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
