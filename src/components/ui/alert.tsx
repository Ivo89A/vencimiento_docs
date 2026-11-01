import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: ComponentProps<"div">) {
  return <div role="note" className={cn("flex items-start gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm leading-6 text-foreground [&>svg]:mt-1 [&>svg]:size-4 [&>svg]:shrink-0", className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("font-semibold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}
