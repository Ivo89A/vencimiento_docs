"use client";

import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl px-5 py-16"><div className="surface p-6 sm:p-10"><TriangleAlert size={30} aria-hidden="true" className="mb-6 text-destructive" /><p className="text-sm font-semibold text-destructive">No se pudo cargar la información</p><h1 className="mt-3 text-2xl font-semibold tracking-tight">La operación no se completó</h1><p className="my-5 text-sm leading-7 text-muted-foreground">Intentá nuevamente. Si el problema continúa, pedile al administrador que revise la conexión y la configuración del sistema.</p><Button onClick={reset}>Reintentar</Button></div></main>;
}
