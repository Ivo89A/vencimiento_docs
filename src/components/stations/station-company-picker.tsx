"use client";

import { useEffect, useId, useState, type Ref } from "react";
import type { StationCompanyOption } from "@/domains/stations/station.types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (value: string) => void;
  initialOption?: StationCompanyOption;
  required?: boolean;
  includeInactive?: boolean;
  label?: string;
  error?: string;
  selectRef?: Ref<HTMLSelectElement>;
};

export function StationCompanyPicker({
  value, onChange, initialOption, required = false, includeInactive = false,
  label = "Razón social", error, selectRef,
}: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StationCompanyOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(initialOption);
  const [hasMore, setHasMore] = useState(false);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const search = new URLSearchParams({ q: query, page: String(page), active: includeInactive ? "all" : "true" });
        const response = await fetch(`/api/stations/company-options?${search}`, { signal: controller.signal });
        if (!response.ok) throw new Error("OPTIONS_UNAVAILABLE");
        const result = await response.json() as { data: { items: StationCompanyOption[]; hasMore: boolean } };
        if (controller.signal.aborted) return;
        setItems(result.data.items);
        setHasMore(result.data.hasMore);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) { setItems([]); setHasMore(false); setFailed(true); }
      } finally { if (!controller.signal.aborted) setPending(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, includeInactive, retry]);

  const options = selectedOption && !items.some((item) => item.id === selectedOption.id)
    ? [selectedOption, ...items] : items;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 text-sm font-medium text-slate-700">{label}{required ? " *" : ""}</label>
      <label htmlFor={`${id}-query`} className="sr-only">Buscar empresa para el selector</label>
      <Input id={`${id}-query`} type="search" value={query} maxLength={100} placeholder="Buscar empresa…"
        onChange={(event) => { setQuery(event.target.value); setPage(1); setItems([]); setPending(true); }} />
      <select
        ref={selectRef} id={id} name="legalEntityId" value={value} aria-required={required}
        aria-invalid={!!error} aria-describedby={error ? `${id}-error` : `${id}-help`}
        className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        onChange={(event) => {
          setSelectedOption(options.find((item) => item.id === event.target.value));
          onChange(event.target.value);
        }}
      >
        <option value="">{required ? "Seleccioná una empresa" : "Todas las razones sociales"}</option>
        {options.map((item) => <option key={item.id} value={item.id}>{item.label}{item.active ? "" : " (inactiva)"}</option>)}
      </select>
      <div id={`${id}-help`} aria-live="polite" className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {pending ? <span>Cargando empresas…</span> : failed ? <>
          <span>No se pudieron cargar las empresas.</span>
          <Button type="button" variant="ghost" onClick={() => { setPending(true); setRetry((value) => value + 1); }}>Reintentar</Button>
        </> : <>
          <span>{items.length === 0 ? "No hay resultados para esta búsqueda." : `Página ${page}`}</span>
          {page > 1 ? <Button type="button" variant="ghost" onClick={() => { setPending(true); setPage((value) => value - 1); }}>Anterior</Button> : null}
          {hasMore ? <Button type="button" variant="ghost" onClick={() => { setPending(true); setPage((value) => value + 1); }}>Más empresas</Button> : null}
        </>}
      </div>
      {error ? <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export function StationCompanyFilter({ initialOption }: { initialOption?: StationCompanyOption }) {
  const [value, setValue] = useState(initialOption?.id ?? "");
  return <StationCompanyPicker value={value} onChange={setValue} initialOption={initialOption} includeInactive label="Filtrar por razón social" />;
}
