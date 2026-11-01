import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="input-group" className={cn("flex min-h-11 min-w-0 items-center rounded-lg border border-input bg-card shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 has-[[aria-invalid=true]]:border-destructive", className)} {...props} />;
}

export function InputGroupInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn("min-w-0 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0", className)} {...props} />;
}

export function InputGroupAddon({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="input-group-addon" className={cn("flex shrink-0 items-center text-muted-foreground", className)} {...props} />;
}
