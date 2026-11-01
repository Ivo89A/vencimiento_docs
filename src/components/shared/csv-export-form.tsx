"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  query: Record<string, string | number | undefined>;
  endpoint: string;
  formId: string;
  filename: string;
};

export function CsvExportForm({ query, endpoint, formId, filename }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form id={formId} onSubmit={async (event) => {
      event.preventDefault();
      setPending(true);
      setMessage("");
      const search = new URLSearchParams();
      for (const [key, value] of new FormData(event.currentTarget)) {
        if (typeof value === "string") search.append(key, value);
      }
      try {
        const response = await fetch(`${endpoint}?${search}`);
        if (!response.ok) {
          const result = await response.json();
          setMessage(result.error?.message ?? "No se pudo exportar.");
          return;
        }
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMessage("CSV generado correctamente.");
      } catch { setMessage("No se pudo descargar el archivo. Intentá nuevamente."); }
      finally { setPending(false); }
    }}>
      {Object.entries(query).filter(([, value]) => value !== undefined).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={String(value)} />
      ))}
      <Button variant="outline" disabled={pending} type="submit">
        <Download size={16} />{pending ? "Exportando…" : "Exportar CSV"}
      </Button>
      {message ? <p role="status" className="mt-2 max-w-xs text-xs text-slate-600">{message}</p> : null}
    </form>
  );
}
