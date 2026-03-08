import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// This component wraps a surface with the project card styling.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-border/80 bg-white/80 p-6 shadow-panel backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

