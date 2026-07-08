import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border bg-card p-4 text-card-foreground shadow-soft", className)}
      {...props}
    />
  );
}
