"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createDocumentTypeSchema, documentConfigurationSchema, documentEntityKinds, documentEntityLabels, criticalityLabels, type DocumentConfiguration } from "@/domains/documents/document.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = { initial?: DocumentConfiguration & { id: string; code: string; version: number }; entityId?: string };
export function DocumentTypeForm({ initial, entityId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<DocumentConfiguration["fields"]>(initial?.fields ?? []);
  return <form className="form-panel flex flex-col gap-7" onSubmit={async (event) => {
    event.preventDefault(); setError("");
    const data = new FormData(event.currentTarget);
    const configuration = {
      name: data.get("name"), description: data.get("description"), category: data.get("category"),
      appliesTo: data.getAll("appliesTo"), required: data.has("required"), criticality: data.get("criticality"),
      requiresApproval: data.has("requiresApproval"), expires: data.has("expires"), warningDays: Number(data.get("warningDays")),
      alertDays: String(data.get("alertDays")).split(",").filter((value) => value.trim() !== "").map(Number), fields,
    };
    const parsed = initial ? documentConfigurationSchema.safeParse(configuration) : createDocumentTypeSchema.safeParse({ ...configuration, code: data.get("code") });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisá la configuración."); return; }
    setPending(true);
    try {
      const response = await fetch(initial ? `/api/document-types/${initial.id}` : "/api/document-types", {
        method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initial ? { ...parsed.data, version: initial.version } : parsed.data),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error?.message ?? "No se pudo guardar."); return; }
      const search = new URLSearchParams({ guardado: "1", q: result.data.code, ...(entityId ? { entityId } : {}) });
      router.push(`/documentacion/tipos?${search}`); router.refresh();
    } catch { setError("No se pudo confirmar el guardado. Consultá el catálogo antes de reintentar."); }
    finally { setPending(false); }
  }}>
    <div className="border-b border-border pb-5"><h2 className="font-semibold">Configuración del requisito</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Definí qué documentación se solicita, a quién se aplica y cómo se conserva cada revisión.</p></div>
    <div className="grid gap-5 md:grid-cols-2">
      <label className="text-sm">Código interno<Input name="code" required maxLength={50} defaultValue={initial?.code} disabled={!!initial} placeholder="BOMBEROS" /></label>
      <label className="text-sm">Nombre<Input name="name" required maxLength={200} defaultValue={initial?.name} /></label>
      <label className="text-sm">Categoría<Input name="category" required maxLength={200} defaultValue={initial?.category} /></label>
      <label className="text-sm">Criticidad<select name="criticality" defaultValue={initial?.criticality ?? "HIGH"} className="block min-h-11 w-full rounded-lg border px-3">
        {Object.entries(criticalityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="text-sm md:col-span-2">Descripción<textarea name="description" maxLength={2000} defaultValue={initial?.description ?? ""} className="block min-h-24 w-full rounded-lg border p-3" /></label>
    </div>
    <fieldset><legend className="mb-3 text-sm font-semibold">Se aplica a</legend><div className="flex flex-wrap gap-4">
      {documentEntityKinds.map((kind) => <label key={kind} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="appliesTo" value={kind} defaultChecked={initial ? initial.appliesTo.includes(kind) : kind === "STATION"} />{documentEntityLabels[kind]}</label>)}
    </div></fieldset>
    <div className="flex flex-wrap gap-4">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="required" defaultChecked={initial?.required ?? true} />Obligatorio</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="requiresApproval" defaultChecked={initial?.requiresApproval ?? true} />Requiere aprobación</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="expires" defaultChecked={initial?.expires ?? true} />Tiene vencimiento</label>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <label className="text-sm">Próximo a vencer (días)<Input type="number" name="warningDays" required min={0} max={3650} defaultValue={initial?.warningDays ?? 30} /></label>
      <label className="text-sm">Anticipaciones de aviso (separadas por coma)<Input name="alertDays" defaultValue={(initial?.alertDays ?? [60, 30, 15, 7, 0]).join(",")} /></label>
    </div>
    <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Campos personalizados</legend>
      {fields.map((field, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
        <label className="text-sm">Clave del campo {index + 1}<Input required maxLength={50} value={field.key} onChange={(event) => setFields((items) => items.map((item, position) => position === index ? { ...item, key: event.target.value } : item))} /></label>
        <label className="text-sm">Etiqueta del campo {index + 1}<Input required maxLength={200} value={field.label} onChange={(event) => setFields((items) => items.map((item, position) => position === index ? { ...item, label: event.target.value } : item))} /></label>
        <label className="text-sm">Tipo del campo {index + 1}<select className="block min-h-11 w-full rounded-lg border px-3" value={field.type} onChange={(event) => setFields((items) => items.map((item, position) => position === index ? { ...item, type: event.target.value as typeof field.type } : item))}>
          <option value="TEXT">Texto</option><option value="NUMBER">Número</option><option value="DATE">Fecha</option><option value="BOOLEAN">Sí / No</option>
        </select></label>
        <div className="flex items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={field.required} onChange={(event) => setFields((items) => items.map((item, position) => position === index ? { ...item, required: event.target.checked } : item))} />Obligatorio</label>
          <Button type="button" variant="outline" onClick={() => setFields((items) => items.filter((_, position) => position !== index))}>Quitar campo {index + 1}</Button>
        </div>
      </div>)}
      <Button type="button" variant="outline" disabled={fields.length >= 30} onClick={() => setFields((items) => [...items, { key: "", label: "", type: "TEXT", required: false }])}>Agregar campo</Button>
    </fieldset>
    <p className="text-xs leading-6 text-slate-500">Esta configuración se conserva por revisión. Cambiarla no modifica obligaciones ya asignadas. Los avisos se configuran aquí; su envío se habilitará al completar el worker.</p>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-6"><Button type="submit" disabled={pending}>{pending ? "Guardando…" : initial ? "Crear revisión" : "Crear tipo documental"}</Button>
      <Button asChild variant="outline"><Link href={entityId ? `/documentacion/tipos?entityId=${entityId}` : "/documentacion/tipos"}>Cancelar</Link></Button>
    </div>
  </form>;
}
