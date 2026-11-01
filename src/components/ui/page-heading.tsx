import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
    <div className="min-w-0">{eyebrow ? <p className="mb-2 text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
      <h1 className="text-3xl font-bold tracking-[-.04em] text-foreground sm:text-[2.125rem]">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>{action ? <div className="shrink-0">{action}</div> : null}
  </div>;
}
