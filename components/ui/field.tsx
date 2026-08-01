import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared surface for every form control. Height and horizontal padding are added
// per control, so a textarea can grow while an input and a select stay aligned.
export const fieldSurface =
  "w-full rounded-md border border-border bg-surface text-sm text-text-primary transition-colors placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted";

type Props = {
  label: string;
  htmlFor: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, action, className, children }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}
