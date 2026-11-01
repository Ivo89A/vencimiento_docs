import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div role="status" aria-label="Cargando información…" className="mx-auto flex max-w-6xl flex-col gap-6 p-6 sm:p-10"><span className="text-sm text-muted-foreground">Cargando información…</span><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-2/3" /><div className="surface flex flex-col gap-5 p-6"><Skeleton className="h-11 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div></div>;
}
