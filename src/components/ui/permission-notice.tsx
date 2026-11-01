import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PermissionNotice() {
  return (
    <section className="surface max-w-xl p-6 sm:p-8">
      <ShieldCheck size={30} aria-hidden="true" className="mb-5 text-primary" />
      <h1 className="text-2xl font-semibold tracking-tight">No tenés permiso para acceder</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Si necesitás esta operación, solicitá al administrador que revise tus permisos y asignaciones.</p>
      <Button asChild className="mt-6" variant="outline"><Link href="/inicio">Volver al inicio</Link></Button>
    </section>
  );
}
