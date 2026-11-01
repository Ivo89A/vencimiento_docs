"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { operationalStatuses, operationalStatusLabels, stationSchema, type StationInput } from "@/domains/stations/station.schemas";
import type { StationCompanyOption } from "@/domains/stations/station.types";
import { StationCompanyPicker } from "./station-company-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";

type Props = {
  initial?: StationInput & { id: string; version: number };
  company?: StationCompanyOption;
};

const fields = [
  { name: "name", label: "Nombre de la estación", required: true },
  { name: "code", label: "Código interno", required: true },
  { name: "address", label: "Dirección", required: true },
  { name: "province", label: "Provincia", required: true },
  { name: "locality", label: "Localidad", required: true },
  { name: "responsible", label: "Responsable", required: true },
  { name: "phone", label: "Teléfono", type: "tel", required: false },
  { name: "email", label: "Email", type: "email", required: false },
] satisfies { name: keyof StationInput; label: string; required: boolean; type?: string }[];

export function StationForm({ initial, company }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm<StationInput>({
    resolver: zodResolver(stationSchema),
    defaultValues: {
      name: initial?.name ?? "", code: initial?.code ?? "", legalEntityId: initial?.legalEntityId ?? company?.id ?? "",
      operationalStatus: initial?.operationalStatus ?? "OPERATIONAL",
      address: initial?.address ?? "", province: initial?.province ?? "", locality: initial?.locality ?? "",
      responsible: initial?.responsible ?? "", phone: initial?.phone ?? "", email: initial?.email ?? "",
    },
  });

  return (
    <form noValidate className="form-panel"
      onSubmit={form.handleSubmit(async (data) => {
        setError("");
        try {
          const response = await fetch(initial ? `/api/stations/${initial.id}` : "/api/stations", {
            method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(initial ? { ...data, version: initial.version } : data),
          });
          const result = await response.json();
          if (!response.ok) { setError(result.error?.message ?? "No se pudo guardar la estación."); return; }
          router.push(`/estaciones/${result.data.id}?guardado=1`);
          router.refresh();
        } catch { setError("No se pudo confirmar el guardado. Consultá el listado antes de reintentar para evitar duplicados."); }
      })}
    >
      <div className="mb-7 border-b border-slate-100 pb-5">
        <h2 className="font-semibold">Datos de la estación</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Los campos con * son obligatorios. El código es único dentro de cada razón social.</p>
      </div>
      <FieldGroup className="md:grid-cols-2">
        <Controller name="legalEntityId" control={form.control} render={({ field, fieldState }) => (
          <StationCompanyPicker value={field.value} onChange={field.onChange} selectRef={field.ref}
            initialOption={company} required error={fieldState.error?.message} />
        )} />
        <div>
          <label htmlFor="operationalStatus" className="mb-2 text-sm font-medium text-slate-700">Estado operativo *</label>
          <select id="operationalStatus" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            {...form.register("operationalStatus")} aria-invalid={!!form.formState.errors.operationalStatus}>
            {operationalStatuses.map((value) => <option key={value} value={value}>{operationalStatusLabels[value]}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">Describe la operación de la estación, no su cumplimiento documental.</p>
        </div>
        {fields.map((field) => (
          <Field key={field.name} data-invalid={!!form.formState.errors[field.name]}>
            <label htmlFor={field.name} className="mb-2 text-sm font-medium text-slate-700">{field.label}{field.required ? " *" : ""}</label>
            <Input id={field.name} type={"type" in field ? field.type : "text"}
              maxLength={field.name === "email" ? 254 : ["code", "phone"].includes(field.name) ? 50 : 200}
              {...form.register(field.name)} aria-required={field.required}
              aria-invalid={!!form.formState.errors[field.name]}
              aria-describedby={form.formState.errors[field.name] ? `${field.name}-error` : undefined} />
            {form.formState.errors[field.name] ? <p id={`${field.name}-error`} className="mt-1 text-xs text-red-700">{form.formState.errors[field.name]?.message}</p> : null}
          </Field>
        ))}
      </FieldGroup>
      {initial ? <p className="mt-6 text-xs leading-6 text-slate-500">Cambiar de razón social requiere acceso a ambas empresas y no se permite si hay tiendas asociadas. La operación queda en el historial.</p> : null}
      {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
      <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
        <Button variant="outline" asChild><Link href={initial ? `/estaciones/${initial.id}` : "/estaciones"}>Cancelar</Link></Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando…" : initial ? "Guardar cambios" : "Crear estación"}
        </Button>
      </div>
    </form>
  );
}
