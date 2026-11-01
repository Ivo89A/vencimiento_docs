"use client";

import Link from "next/link";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { ArrowDownUp } from "lucide-react";
import type { LegalEntityListItem } from "@/domains/legal-entities/legal-entity.types";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = {
  items: Pick<LegalEntityListItem, "id" | "legalName" | "tradeName" | "cuit" | "locality" | "province" | "responsible" | "active">[];
  canExport: boolean;
  sortHref: string;
};

export function LegalEntityTable({ items, canExport, sortHref }: Props) {
  const isMobile = useMobileViewport();
  if (isMobile) return <div className="p-4"><Link href={sortHref} className="mb-4 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">Ordenar por empresa<ArrowDownUp size={14} aria-hidden="true" /></Link><ul aria-label="Razones sociales autorizadas" className="flex flex-col gap-4">{items.map((item) => <li key={item.id} className="rounded-xl border border-border p-4"><div className="flex items-start justify-between gap-3"><Link href={`/razones-sociales/${item.id}`} className="min-w-0 break-words text-sm font-semibold hover:text-primary">{item.legalName}</Link><StatusBadge active={item.active} /></div><p className="mt-2 break-words text-xs text-muted-foreground">{item.tradeName}</p><dl className="mt-4 grid grid-cols-2 gap-4 text-xs"><div><dt className="text-muted-foreground">CUIT</dt><dd className="mt-1 tabular-nums">{item.cuit.slice(0, 2)}-{item.cuit.slice(2, 10)}-{item.cuit.slice(10)}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Responsable</dt><dd className="mt-1 break-words">{item.responsible}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Ubicación</dt><dd className="mt-1 break-words">{item.locality}, {item.province}</dd></div></dl>{canExport ? <label className="mt-4 flex min-h-11 items-center gap-3 border-t border-border pt-2 text-sm text-muted-foreground"><input type="checkbox" name="ids" value={item.id} form="export-legal-entities" aria-label={`Seleccionar ${item.legalName}`} />Seleccionar para CSV</label> : null}<Link href={`/razones-sociales/${item.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Ver detalle<span className="sr-only"> de {item.legalName}</span></Link></li>)}</ul></div>;
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de razones sociales, desplazamiento horizontal disponible">
      <table className="data-table w-full min-w-[960px] text-left text-sm">
        <caption className="sr-only">Razones sociales autorizadas</caption>
        <thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
          <tr>
            {canExport ? <th className="px-4 py-4"><span className="sr-only">Selección</span></th> : null}
            <th className="px-6 py-4">
              <Link className="inline-flex items-center gap-2" href={sortHref}>
                Empresa <ArrowDownUp size={13} />
              </Link>
            </th>
            <th className="px-6 py-4">CUIT</th>
            <th className="px-6 py-4">Ubicación</th>
            <th className="px-6 py-4">Responsable</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60">
              {canExport ? (
                <td className="px-4 py-5">
                  <input
                    className="size-4 accent-teal-700"
                    type="checkbox"
                    name="ids"
                    value={item.id}
                    form="export-legal-entities"
                    aria-label={`Seleccionar ${item.legalName}`}
                  />
                </td>
              ) : null}
              <td className="min-w-52 px-6 py-5">
                <Link href={`/razones-sociales/${item.id}`} className="font-semibold text-slate-800 hover:text-teal-700">
                  {item.legalName}
                </Link>
                <p className="mt-1 text-xs text-slate-500">{item.tradeName}</p>
              </td>
              <td className="whitespace-nowrap px-6 py-5 tabular-nums">
                {item.cuit.slice(0, 2)}-{item.cuit.slice(2, 10)}-{item.cuit.slice(10)}
              </td>
              <td className="px-6 py-5 text-slate-500">
                {item.locality}<span className="mt-1 block text-xs">{item.province}</span>
              </td>
              <td className="px-6 py-5 text-slate-500">{item.responsible}</td>
              <td className="px-6 py-5"><StatusBadge active={item.active} /></td>
              <td className="px-6 py-5">
                <Link className="whitespace-nowrap font-semibold text-teal-700 hover:underline" href={`/razones-sociales/${item.id}`}>
                  Ver detalle<span className="sr-only"> de {item.legalName}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
