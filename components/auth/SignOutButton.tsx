"use client";

import posthog from "posthog-js";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  className?: string;
};

// Owns the form, not just the button, so that the capture-then-reset pair travels
// with sign-out wherever it moves. It currently sits on the ComingSoon stubs; from
// feature 14 it belongs in the authenticated navbar.
export function SignOutButton({ userId, className }: Props) {
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
      <Button type="submit" variant="secondary" className="w-full">
        Sign out
      </Button>
    </form>
  );
}
