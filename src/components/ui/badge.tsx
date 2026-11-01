import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: { variant: {
    secondary: "border-border bg-muted text-muted-foreground",
    success: "border-success-border bg-success-surface text-success",
    warning: "border-warning/20 bg-warning-surface text-warning",
  } }, defaultVariants: { variant: "secondary" },
});

export function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
