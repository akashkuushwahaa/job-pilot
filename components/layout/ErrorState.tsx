"use client";

import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description: string;
  digest?: string;
  onRetry: () => void;
};

// Shared by app/error.tsx and app/global-error.tsx. Uses the Auth shell recipe from
// ui-registry.md; that primitive now has four users and is due for extraction.
export function ErrorState({ title, description, digest, onRetry }: Props) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">
            Something went wrong
          </p>
          <h1 className="mt-2 text-base font-semibold text-text-primary">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {description}
          </p>

          {digest ? (
            <dl className="mt-6 border-t border-border pt-6">
              <dt className="text-xs font-medium tracking-wider text-text-muted uppercase">
                Reference
              </dt>
              <dd className="mt-1 text-sm text-text-primary">{digest}</dd>
            </dl>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            className="mt-6 w-full"
            onClick={onRetry}
          >
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
