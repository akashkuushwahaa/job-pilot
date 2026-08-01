"use client";

import posthog from "posthog-js";

import { signOut } from "@/actions/auth";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  className?: string;
};

// Owns the form, not just the button, so that the capture-then-reset pair travels
// with sign-out wherever it moves. It now lives in AppNavbar, which is the one
// control every authenticated page shares.
export function SignOutButton({
  userId,
  variant = "secondary",
  fullWidth = true,
  className,
}: Props) {
  const handleSubmit = (): void => {
    // The Server Action redirects immediately after this, which cancels in-flight
    // XHRs — sendBeacon is the one transport the browser still delivers after
    // unload, and send_instantly skips the batch queue. reset() afterwards is safe:
    // it clears persistence and session state but not the request queue, so this
    // event still goes out under the identified distinct ID.
    posthog.capture(
      "user_signed_out",
      { userId },
      { send_instantly: true, transport: "sendBeacon" },
    );
    posthog.reset();
  };

  return (
    <form action={signOut} onSubmit={handleSubmit} className={className}>
      <Button
        type="submit"
        variant={variant}
        size={fullWidth ? "md" : "sm"}
        className={cn(fullWidth && "w-full")}
      >
        Sign out
      </Button>
    </form>
  );
}
