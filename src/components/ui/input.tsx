import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn("flex min-h-11 min-w-0 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:bg-muted disabled:opacity-70", className)} {...props} />;
}
