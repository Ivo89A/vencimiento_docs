import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-11 px-4 py-2 [&_svg]:size-4 [&_svg]:shrink-0",
  { variants: { variant: {
    default: "border border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80",
    outline: "border border-border bg-card text-foreground shadow-xs hover:border-primary/40 hover:bg-muted active:bg-muted",
    destructive: "bg-destructive text-white hover:bg-destructive/90",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  } }, defaultVariants: { variant: "default" } },
);

type Props = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, asChild = false, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, className }))} {...props} />;
}
