"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  icon: ReactNode;
};

export function OAuthButton({ label, icon }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {pending ? `Connecting to ${label}…` : `Continue with ${label}`}
    </Button>
  );
}
