"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { ErrorState } from "@/components/layout/ErrorState";
import { inter } from "@/lib/fonts";
import "./globals.css";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Replaces the root layout entirely when the layout itself throws, so it inherits
// nothing: the <html>/<body>, globals.css and the font variable all have to be
// declared here or this renders as unstyled browser-default HTML.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <ErrorState
          title="The app failed to start"
          description="Something went wrong before the page could render. The error has been reported — try again, and if it persists the problem is on our side."
          digest={error.digest}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
