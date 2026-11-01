import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)} {...props} />;
}
export function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex max-w-md flex-col items-center gap-3", className)} {...props} />;
}
export function EmptyTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-semibold", className)} {...props} />;
}
export function EmptyDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}
