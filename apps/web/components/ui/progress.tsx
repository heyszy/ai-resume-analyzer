import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value = 0,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full rounded-full bg-slate-900 transition-[width] duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

export { Progress };
