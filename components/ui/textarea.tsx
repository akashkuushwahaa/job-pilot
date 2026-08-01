import { fieldSurface } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"textarea">;

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(fieldSurface, "min-h-24 px-3 py-2 leading-6", className)}
      {...props}
    />
  );
}
