import { ChevronDown } from "lucide-react";

import { fieldSurface } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"select">;

export function Select({ className, children, ...props }: Props) {
  return (
    <div className="relative">
      <select
        className={cn(fieldSurface, "h-10 appearance-none pr-9 pl-3", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-secondary"
      />
    </div>
  );
}
