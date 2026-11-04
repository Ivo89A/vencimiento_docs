"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentConfiguration } from "@/domains/documents/document.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Values = Record<string, string | number | boolean>;
type Props = {
  requirementId: string;
  requirementVersion: number;
  expires: boolean;
  fields: DocumentConfiguration["fields"];
  initial?: { id: string; version: number; issuedOn: string | null; expiresOn: string | null; values: Values; notes: string };
};

export function PresentationForm({ requirementId, requirementVersion, expires, fields, initial }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const requestId = useRef<string | null>(null);
  const listHref = `/documentacion/obligaciones/${requirementId}`;

  function reportError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  return <form className="form-panel flex flex-col gap-7" autoComplete="off" aria-busy={pending} onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    setError(""); setDateError("");
    const form = new FormData(event.currentTarget);
    const issuedOn = String(form.get("issuedOn") ?? "") || null;
    const expiresOn = expires ? String(form.get("expiresOn") ?? "") || null : null;
    if (issuedOn && expiresOn && issuedOn > expiresOn) {
      setDateError("El vencimiento no puede ser anterior a la emisión.");
      reportError("Revisá las fechas antes de guardar."); return;
    }
    const values: Values = {};
    for (const field of fields) {
      const raw = String(form.get(`field:${field.key}`) ?? "");
      if (raw === "") continue;
      Object.defineProperty(values, field.key, { value: field.type === "BOOLEAN" ? raw === "true" : field.type === "NUMBER" ? Number(raw) : raw, enumerable: true });
    }
    const content = { issuedOn, expiresOn, values, notes: String(form.get("notes") ?? "") };
    requestId.current ??= crypto.randomUUID();
    submitting.current = true; setPending(true);
    try {
      const response = await fetch(initial ? `/api/document-presentations/${initial.id}` : `/api/document-requirements/${requirementId}/presentations`, {
        method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial ? { ...content, action: "UPDATE", version: initial.version } : { ...content, requirementVersion, requestId: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok) { reportError(result.error?.message ?? "No se pudo guardar el borrador. Consultá las presentaciones antes de reintentar."); return; }
      router.push(`/documentacion/presentaciones/${result.data.id}`); router.refresh();
    } catch {
      reportError("No se pudo confirmar el guardado. Consultá las presentaciones antes de reintentar; tus datos siguen en el formulario.");
    } finally { submitting.current = false; setPending(false); }
  }}>
    {error ? <div ref={errorRef} role="alert" tabIndex={-1} className="rounded-lg border border-destructive p-4 text-sm text-destructive">
      <p>{error}</p><Link href={listHref} className="mt-2 inline-block underline">Consultar presentaciones</Link>
    </div> : null}
    <Alert><div><AlertTitle>Solo datos en borrador</AlertTitle><AlertDescription>Guardar no carga un archivo, no solicita aprobación y no acredita cumplimiento. La carga privada y el análisis de archivos siguen pendientes.</AlertDescription></div></Alert>
    <fieldset disabled={pending} className="flex min-w-0 flex-col gap-5">
      <legend className="mb-5 font-semibold">Fechas del certificado</legend>
      <FieldGroup className="md:grid-cols-2">
        <Field><FieldLabel htmlFor="issuedOn">Fecha de emisión (opcional)</FieldLabel><Input id="issuedOn" name="issuedOn" type="date" defaultValue={initial?.issuedOn ?? ""} /></Field>
        {expires ? <Field data-invalid={!!dateError}><FieldLabel htmlFor="expiresOn">Fecha de vencimiento (obligatoria)</FieldLabel><Input id="expiresOn" name="expiresOn" type="date" required defaultValue={initial?.expiresOn ?? ""} aria-invalid={!!dateError} aria-describedby={dateError ? "expiresOn-error" : undefined} />
          {dateError ? <FieldError id="expiresOn-error">{dateError}</FieldError> : null}</Field> : null}
      </FieldGroup>
    </fieldset>
    {fields.length ? <fieldset disabled={pending} className="min-w-0"><legend className="mb-5 font-semibold">Datos de la configuración asignada</legend>
      <FieldGroup className="md:grid-cols-2">{fields.map((field) => {
        const id = `field-${field.key}`;
        const value = initial?.values[field.key];
        return <Field key={field.key}><FieldLabel htmlFor={id}>{field.label}{field.required ? " (obligatorio)" : " (opcional)"}</FieldLabel>
          {field.type === "BOOLEAN" ? <select id={id} name={`field:${field.key}`} required={field.required} defaultValue={value === undefined ? "" : String(value)} className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Sin informar</option><option value="true">Sí</option><option value="false">No</option>
          </select> : <Input id={id} name={`field:${field.key}`} required={field.required} type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
            step={field.type === "NUMBER" ? "any" : undefined} maxLength={field.type === "TEXT" ? 2000 : undefined} defaultValue={value === undefined ? "" : String(value)} />}
        </Field>;
      })}</FieldGroup>
    </fieldset> : null}
    <Field><FieldLabel htmlFor="notes">Observaciones (opcional)</FieldLabel><textarea id="notes" name="notes" maxLength={2000} disabled={pending} defaultValue={initial?.notes ?? ""} className="block min-h-28 w-full rounded-lg border border-input bg-background p-3 text-sm" /></Field>
    <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-6">
      <Button asChild variant="outline"><Link href={listHref}>Volver a presentaciones</Link></Button>
      <Button type="submit" disabled={pending}>{pending ? "Guardando…" : initial ? "Guardar cambios del borrador" : "Guardar borrador"}</Button>
    </div>
  </form>;
}
