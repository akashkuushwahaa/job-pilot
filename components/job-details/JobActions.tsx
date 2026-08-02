import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  company: string;
  applyUrl: string | null;
};

// The page's primary action. Every Adzuna row carries a redirect URL, so the
// disabled branch should never be seen — but a job saved without one would
// otherwise render a button that opens nothing, and a disabled control that does
// not say why reads as broken. Same treatment as the Generate blocker in
// ResumeUpload: muted, permanent, directly under the row.
export function JobActions({ company, applyUrl }: Props) {
  if (applyUrl === null) {
    return (
      <div>
        <Button
          type="button"
          size="lg"
          disabled
          className="h-12 w-full rounded-lg"
        >
          Apply Now
        </Button>
        <p className="mt-3 text-xs text-text-muted">
          This listing did not include an apply link. Use View Job Post above to
          open it at the source.
        </p>
      </div>
    );
  }

  return (
    <a
      href={applyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({
        size: "lg",
        className: "h-12 w-full rounded-lg",
      })}
    >
      Apply Now at {company}
    </a>
  );
}
