"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { ErrorState } from "@/components/layout/ErrorState";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Route-level boundary. Without it every thrown page escalates to global-error.tsx,
// which replaces the whole document. This keeps the chrome and the design system.
export default function Error({ error, reset }: Props) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <ErrorState
      title="This page could not be loaded"
      description="The error has been reported. Try again — if it keeps happening, the problem is on our side, not yours."
      digest={error.digest}
      onRetry={reset}
    />
  );
}
