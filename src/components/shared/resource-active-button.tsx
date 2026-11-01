"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Archive, CircleCheck } from "lucide-react";

type Props = {
  id: string;
  active: boolean;
  version: number;
  endpoint: string;
  resourceLabel: string;
  deactivateDescription: string;
};

export function ResourceActiveButton({ id, active, version, endpoint, resourceLabel, deactivateDescription }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <Button variant="outline" onClick={() => { setError(""); dialog.current?.showModal(); }}>
        {active ? "Desactivar" : "Activar"}
      </Button>
      <dialog
        ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border-0 bg-white p-6 text-slate-950 shadow-xl backdrop:bg-slate-950/40"
        onCancel={(event) => { if (pending) event.preventDefault(); }}
      >
        <span className={`mb-5 flex size-12 items-center justify-center rounded-xl ${active ? "bg-red-50 text-red-700" : "bg-teal-50 text-primary"}`}>{active ? <Archive size={22} aria-hidden="true" /> : <CircleCheck size={22} aria-hidden="true" />}</span>
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">{active ? "Desactivar" : "Activar"} {resourceLabel}</h2>
        <p id={descriptionId} className="mb-5 mt-3 text-sm leading-6 text-slate-500">
          {active ? deactivateDescription : "El registro volverá a estar disponible para las operaciones permitidas."}
        </p>
        {error ? <p role="alert" className="mb-4 text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-3">
          <Button autoFocus variant="outline" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</Button>
          <Button variant={active ? "destructive" : "default"} disabled={pending} onClick={async () => {
            setPending(true);
            setError("");
            try {
              const response = await fetch(`${endpoint}/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !active, version }),
              });
              const result = await response.json();
              if (!response.ok) { setError(result.error?.message ?? "No se pudo cambiar el estado."); return; }
              dialog.current?.close();
              router.refresh();
            } catch { setError("No pudimos confirmar el cambio. Actualizá la página antes de reintentar."); }
            finally { setPending(false); }
          }}>{pending ? "Procesando…" : "Confirmar"}</Button>
        </div>
      </dialog>
    </div>
  );
}
