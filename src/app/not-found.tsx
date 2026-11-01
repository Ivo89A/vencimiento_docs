import Link from "next/link";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="mx-auto max-w-xl px-5 py-16"><div className="surface p-6 sm:p-10"><FileSearch size={32} aria-hidden="true" className="mb-6 text-primary" /><p className="text-xs font-medium text-muted-foreground">Error 404</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">No encontramos ese registro</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Puede que no exista o que no tengas acceso.</p><Button asChild className="mt-7"><Link href="/inicio">Volver al inicio</Link></Button></div></main>;
}
