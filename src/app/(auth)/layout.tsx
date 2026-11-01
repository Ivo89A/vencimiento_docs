import { Building2, FileCheck2, Fuel, ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh lg:grid-cols-[.95fr_1.05fr]">
    <section className="relative hidden flex-col justify-between bg-sidebar p-10 text-white lg:flex xl:p-16">
      <div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[#c4e8dc] text-sidebar"><FileCheck2 size={25} aria-hidden="true" /></span><span className="font-semibold tracking-tight">Gestión documental</span></div>
      <div className="my-16 max-w-lg"><h2 className="text-[clamp(2.5rem,4vw,3.75rem)] font-semibold leading-[1.13] tracking-[-.055em]">La información de tu grupo,<br />en un solo lugar.</h2>
        <p className="mt-6 max-w-sm text-sm leading-7 text-[#c3d0d9]">Empresas, estaciones y obligaciones documentales. Un espacio de trabajo compartido, con acceso controlado.</p>
        <div className="mt-10 border-y border-white/15 py-6"><div className="flex items-center gap-3 text-sm"><Building2 size={18} aria-hidden="true" className="text-[#a9d7c9]" />Estructura empresarial</div><div className="mt-5 flex items-center gap-3 text-sm"><Fuel size={18} aria-hidden="true" className="text-[#a9d7c9]" />Gestión de estaciones</div><div className="mt-5 flex items-center gap-3 text-sm"><FileCheck2 size={18} aria-hidden="true" className="text-[#a9d7c9]" />Obligaciones y trazabilidad</div></div>
      </div>
      <p className="flex items-center gap-2 text-xs text-[#b3c3ce]"><ShieldCheck size={16} aria-hidden="true" />Acceso privado con permisos por usuario</p>
    </section>
    <section className="flex flex-col items-center justify-center bg-card px-5 py-10 sm:px-10">
      <div className="mb-12 flex w-full max-w-sm items-center gap-3 text-sm font-semibold lg:hidden"><FileCheck2 className="text-primary" size={25} aria-hidden="true" />Gestión documental</div>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-12 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} aria-hidden="true" />Solo para usuarios autorizados</p>
    </section>
  </main>;
}
