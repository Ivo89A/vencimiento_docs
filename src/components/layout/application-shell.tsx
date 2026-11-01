"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ChevronRight, FileCheck2, Fuel, Home, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { authClient } from "@/domains/auth/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = { children: React.ReactNode; name: string; email: string; canReadLegalEntities: boolean; canReadStations: boolean; canReadDocuments: boolean };

export function ApplicationShell({ children, name, email, canReadLegalEntities, canReadStations, canReadDocuments }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const links = [{ href: "/inicio", label: "Inicio", icon: Home },
    ...(canReadLegalEntities ? [{ href: "/razones-sociales", label: "Razones sociales", icon: Building2 }] : []),
    ...(canReadStations ? [{ href: "/estaciones", label: "Estaciones de servicio", icon: Fuel }] : []),
    ...(canReadDocuments ? [{ href: "/documentacion", label: "Documentación", icon: FileCheck2 }] : [])];
  const current = links.find((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");

  function closeMenu() { mobileDialog.current?.close(); setMobileOpen(false); }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (media.matches) { mobileDialog.current?.close(); setMobileOpen(false); } };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  const navigation = <>
    <div className="flex min-h-24 items-center justify-between gap-2 px-5">
      <Link href="/inicio" onClick={closeMenu} className="flex items-center gap-3 rounded-lg">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#c4e8dc] text-sidebar"><FileCheck2 size={23} aria-hidden="true" /></span>
        <span className="text-sm font-bold leading-5 tracking-tight text-white">Gestión documental<span className="block text-xs font-normal tracking-normal text-[#b3c3ce]">Control empresarial</span></span>
      </Link>
      <button onClick={closeMenu} aria-label="Cerrar menú" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"><X size={20} aria-hidden="true" /></button>
    </div>
    <div className="mx-5 mb-7 rounded-lg border border-white/15 px-3 py-3"><p className="text-xs text-[#b3c3ce]">Espacio de trabajo</p><p className="mt-1 text-sm font-medium text-white">Grupo empresarial</p></div>
    <nav aria-label="Principal" className="flex flex-col gap-1.5 px-3">{links.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} onClick={closeMenu} aria-current={active ? "page" : undefined}
        className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-[13px] font-medium", active ? "bg-[#c4e8dc] text-[#123f38]" : "text-[#c3d0d9] hover:bg-white/10 hover:text-white")}>
        <Icon size={18} aria-hidden="true" /><span>{label}</span>{active ? <ChevronRight size={14} aria-hidden="true" className="ml-auto" /> : null}
      </Link>;
    })}</nav>
    <div className="mt-auto px-5 pb-5 pt-10"><ShieldCheck size={20} aria-hidden="true" className="mb-2 text-[#8dcbb7]" /><p className="text-xs font-semibold text-[#e1e9ee]">Información privada</p><p className="mt-1 text-xs leading-5 text-[#b3c3ce]">Cada usuario ve solo la información y las operaciones autorizadas.</p></div>
    <div className="border-t border-white/15 p-4">
      <div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{name}</p><p className="mt-1 truncate text-xs text-[#b3c3ce]">{email}</p></div></div>
      <button disabled={signingOut} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-xs font-medium text-[#c3d0d9] hover:bg-white/10 hover:text-white disabled:opacity-50" onClick={async () => {
        setSigningOut(true); setError("");
        try { const result = await authClient.signOut(); if (result.error) throw new Error("signout"); closeMenu(); router.replace("/ingresar"); router.refresh(); }
        catch { setError("No se pudo cerrar la sesión. Reintentá."); setSigningOut(false); }
      }}><LogOut size={16} aria-hidden="true" />{signingOut ? "Cerrando sesión…" : "Cerrar sesión"}</button>
      {error ? <p role="alert" className="mt-2 text-xs text-[#ffb9bc]">{error}</p> : null}
    </div>
  </>;

  return <div className="min-h-dvh">
    <a href="#contenido" className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Ir al contenido</a>
    <aside className="app-navigation fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto bg-sidebar lg:flex">{navigation}</aside>
    <dialog ref={mobileDialog} id="navegacion-movil" aria-label="Navegación principal" onClose={() => setMobileOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget && event.clientX > event.currentTarget.getBoundingClientRect().right) closeMenu(); }}
      className="app-navigation fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-[min(20rem,90vw)] max-w-none border-0 bg-sidebar p-0 text-white open:flex open:flex-col">
      {navigation}
    </dialog>
    <div className="min-w-0 lg:pl-64">
      <header className="flex min-h-20 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" className="size-11 px-0 lg:hidden" aria-label="Abrir menú" aria-expanded={mobileOpen} aria-controls="navegacion-movil" onClick={() => { mobileDialog.current?.showModal(); setMobileOpen(true); }}><Menu aria-hidden="true" /></Button>
          <nav aria-label="Ubicación" className="flex min-w-0 items-center gap-2 text-xs sm:text-sm"><Link href="/inicio" className="hidden text-muted-foreground hover:text-primary sm:block">Espacio de trabajo</Link><ChevronRight aria-hidden="true" size={14} className="hidden text-slate-400 sm:block" /><span className="truncate font-medium text-foreground">{current?.label ?? "Inicio"}</span></nav>
        </div>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={16} aria-hidden="true" className="text-primary" /><span className="hidden sm:inline">Acceso privado</span></span>
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto max-w-[1500px] px-4 py-7 outline-none sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>;
}
