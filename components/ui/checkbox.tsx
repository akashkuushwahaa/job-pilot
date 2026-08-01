import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "type">;

export function Checkbox({ className, ...props }: Props) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded-sm accent-accent focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
