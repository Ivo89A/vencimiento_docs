import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("grid gap-x-6 gap-y-5", className)} {...props} />;
}

export function Field({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="field" className={cn("min-w-0", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-2 text-sm font-medium text-foreground", className)} {...props} />;
}

export function FieldError({ className, ...props }: ComponentProps<"p">) {
  return <p role="status" className={cn("mt-1 text-xs text-destructive", className)} {...props} />;
}
