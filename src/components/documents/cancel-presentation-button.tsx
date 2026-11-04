"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelPresentationButton({ id, version }: { id: string; version: number }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return <section className="surface mt-6 p-5" aria-label="Cancelar borrador">
    <h2 className="font-semibold">Cancelar este borrador</h2>
    <p className="my-3 text-sm text-muted-foreground">Se conservarán los datos y el número de presentación. La cancelación no se puede deshacer.</p>
    <Button variant="outline" onClick={() => { setError(""); dialog.current?.showModal(); }}>Cancelar borrador</Button>
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-xl backdrop:bg-foreground/40"
      onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <h2 id={titleId} className="text-xl font-semibold">Cancelar el borrador definitivamente</h2>
      <p id={descriptionId} className="my-4 text-sm text-muted-foreground">Los datos se conservarán en el historial. No podrás editar ni recuperar este borrador.</p>
      {error ? <p role="alert" className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
      <Button autoFocus variant="outline" disabled={pending} onClick={() => dialog.current?.close()}>Conservar borrador</Button>
      <Button variant="destructive" disabled={pending} onClick={async () => {
        if (lock.current) return;
        lock.current = true; setPending(true); setError("");
        try {
          const response = await fetch(`/api/document-presentations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CANCEL", version }) });
          const result = await response.json();
          if (!response.ok) { setError(result.error?.message ?? "No se pudo cancelar. Actualizá la presentación antes de reintentar."); return; }
          dialog.current?.close(); router.refresh();
        } catch { setError("No se pudo confirmar la cancelación. Actualizá la página antes de reintentar."); }
        finally { lock.current = false; setPending(false); }
      }}>{pending ? "Cancelando…" : "Confirmar cancelación"}</Button>
      </div>
    </dialog>
  </section>;
}
