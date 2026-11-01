"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AssignDocumentButton({ entityId, documentTypeId, typeVersion }: { entityId: string; documentTypeId: string; typeVersion: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return <div><Button disabled={pending} onClick={async () => {
    setPending(true); setMessage("");
    try {
      const response = await fetch("/api/document-requirements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityId, documentTypeId, typeVersion }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error?.message ?? "No se pudo asignar."); return; }
      router.push(`/documentacion?entityId=${entityId}`); router.refresh();
    } catch { setMessage("No se pudo confirmar la asignación. Consultá las obligaciones antes de reintentar."); }
    finally { setPending(false); }
  }}>{pending ? "Asignando…" : "Asignar obligación"}</Button>{message ? <p role="alert" className="mt-2 text-sm text-red-700">{message}</p> : null}</div>;
}
