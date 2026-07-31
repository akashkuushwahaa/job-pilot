"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import posthog from "posthog-js";

import { Button } from "@/components/ui/button";
import type { OAuthProvider } from "@/lib/auth";

type Props = {
  provider: OAuthProvider;
  label: string;
  icon: ReactNode;
};

export function OAuthButton({ provider, label, icon }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      size="lg"
      className="w-full"
      disabled={pending}
      // Submitting navigates away to the provider, which cancels in-flight XHRs —
      // sendBeacon is the one transport the browser still delivers after unload,
      // and send_instantly skips the batch queue it would otherwise sit in.
      // `provider` comes from the prop rather than the label so the breakdown never
      // shifts when the display copy is reworded.
      onClick={() =>
        posthog.capture(
          "oauth_sign_in_started",
          { provider },
          { send_instantly: true, transport: "sendBeacon" },
        )
      }
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
