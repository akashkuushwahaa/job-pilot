import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  path: string;
  onReplace: () => void;
};

// The stored-resume state the design never drew. "View" points at our own route,
// not at storage: GET /api/resume resolves the key from the caller's own row and
// signs it server-side, so a link can never name someone else's object.
export function ResumePreview({ path, onReplace }: Props) {
  const filename = path.split("/").pop() ?? "resume.pdf";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3">
      <FileText aria-hidden className="size-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {filename}
        </p>
        <p className="text-xs text-text-muted">Saved to your profile</p>
      </div>
      <a
        href="/api/resume"
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-accent transition-colors hover:text-accent-dark focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none"
      >
        View
      </a>
      <Button type="button" variant="secondary" size="sm" onClick={onReplace}>
        Replace
      </Button>
    </div>
  );
}
