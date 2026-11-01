"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { legalEntitySchema, type LegalEntityInput } from "@/domains/legal-entities/legal-entity.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup } from "@/components/ui/field";

const emptyValues: LegalEntityInput = { legalName: "", tradeName: "", cuit: "", address: "", province: "", locality: "", email: "", phone: "", responsible: "" };
const fields: { name: keyof LegalEntityInput; label: string; placeholder?: string; type?: string; required?: boolean }[] = [
  { name: "legalName", label: "Nombre legal", required: true },
  { name: "tradeName", label: "Nombre comercial", required: true },
  { name: "cuit", label: "CUIT", placeholder: "XX-XXXXXXXX-X", required: true },
  { name: "responsible", label: "Responsable", required: true },
  { name: "address", label: "Domicilio", required: true },
  { name: "province", label: "Provincia", required: true },
  { name: "locality", label: "Localidad", required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Teléfono", type: "tel" },
];

type Props = { initial?: LegalEntityInput & { id: string; version: number } };

export function LegalEntityForm({ initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const form = useForm<LegalEntityInput>({
    resolver: zodResolver(legalEntitySchema),
    defaultValues: initial ? {
      legalName: initial.legalName, tradeName: initial.tradeName, cuit: initial.cuit,
      address: initial.address, province: initial.province, locality: initial.locality,
      email: initial.email, phone: initial.phone, responsible: initial.responsible,
    } : emptyValues,
  });
  return <form noValidate className="form-panel" onSubmit={form.handleSubmit(async (values) => {
    setError("");
    try {
      const response = await fetch(initial ? `/api/legal-entities/${initial.id}` : "/api/legal-entities", {
        method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial ? { ...values, version: initial.version } : values),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "No se pudo guardar."); return; }
      router.push(`/razones-sociales/${result.data.id}?guardado=1`); router.refresh();
    } catch { setError("No se pudo confirmar el guardado. Consultá el listado antes de reintentar para evitar duplicados."); }
  })}>
    <div className="mb-7 border-b border-slate-100 pb-5"><h2 className="font-semibold">Información de la empresa</h2><p className="mt-1 text-sm text-slate-500">Los campos con * son obligatorios. El CUIT se valida y no puede repetirse.</p></div>
    <FieldGroup className="md:grid-cols-2">{fields.map((field) => <Field key={field.name} data-invalid={!!form.formState.errors[field.name]}>
      <label className="mb-2 text-sm font-medium text-slate-700" htmlFor={field.name}>{field.label}{field.required ? <span className="ml-1 text-teal-700">*</span> : null}</label>
      <Input id={field.name} type={field.type ?? "text"} placeholder={field.placeholder} maxLength={field.name === "email" ? 254 : field.name === "phone" ? 50 : field.name === "cuit" ? 20 : 200} {...form.register(field.name)} aria-required={field.required} aria-invalid={!!form.formState.errors[field.name]} aria-describedby={form.formState.errors[field.name] ? `${field.name}-error` : undefined} />
      {form.formState.errors[field.name] ? <p id={`${field.name}-error`} className="mt-1 text-xs text-red-700">{form.formState.errors[field.name]?.message}</p> : null}
    </Field>)}</FieldGroup>
    {error ? <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}
    <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6"><Button variant="outline" asChild><Link href={initial ? `/razones-sociales/${initial.id}` : "/razones-sociales"}>Cancelar</Link></Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Guardando…" : initial ? "Guardar cambios" : "Crear razón social"}</Button></div>
  </form>;
}
