"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  userId: string;
  email: string;
  name?: string;
};

// Renders nothing. It exists so identification lives in the root layout rather
// than in whichever authenticated page happens to be built — the stub pages that
// carried it before are deleted by features 05, 09 and 14.
export function PostHogIdentity({ userId, email, name }: Props): null {
  useEffect(() => {
    posthog.identify(userId, {
      email,
      ...(name ? { name } : {}),
    });
  }, [email, name, userId]);

  return null;
}
