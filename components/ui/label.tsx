import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"label">;

export function Label({ className, ...props }: Props) {
  return (
    <label
      className={cn(
        "block text-xs font-semibold tracking-wide text-text-dark uppercase",
        className,
      )}
      {...props}
    />
  );
}
