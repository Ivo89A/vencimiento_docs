import Link from "next/link";
import { cn } from "@/lib/utils";

export function DocumentSectionNav({ active, entityId }: { active: "requirements" | "types"; entityId?: string }) {
  const context = entityId ? `?entityId=${entityId}` : "";
  return <nav aria-label="Secciones documentales" className="mb-6 flex gap-6 border-b border-border text-sm">
    {[{ key: "requirements", href: `/documentacion${context}`, label: "Obligaciones" }, { key: "types", href: `/documentacion/tipos${context}`, label: "Tipos documentales" }].map((item) => <Link key={item.key} href={item.href} aria-current={active === item.key ? "page" : undefined} className={cn("inline-flex min-h-12 items-center border-b-2 pb-2", active === item.key ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground")}>{item.label}</Link>)}
  </nav>;
}
