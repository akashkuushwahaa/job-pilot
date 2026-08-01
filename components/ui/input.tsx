import { fieldSurface } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input">;

export function Input({ className, ...props }: Props) {
  // A filled control recedes into a tinted fill and an empty one stays white, so
  // the gaps in a long form read at a glance. Only works for controlled inputs,
  // which is every input on this project.
  const isFilled =
    props.value !== undefined &&
    props.value !== null &&
    String(props.value).length > 0;

  return (
    <input
      className={cn(
        fieldSurface,
        "h-10 px-3",
        isFilled && "bg-surface-secondary",
        className,
      )}
      {...props}
    />
  );
}
