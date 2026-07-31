import Image from "next/image";

export function ProductPreview() {
  return (
    <section className="relative bg-surface pb-20">
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <div className="relative mx-auto max-w-5xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 -top-6 bottom-10 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,var(--color-accent-light),transparent)] blur-2xl"
          />

          <div className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <Image
              src="/images/dashboard-demo.png"
              alt="JobPilot dashboard showing job stats, recent activity and company research charts"
              width={4788}
              height={2416}
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="h-auto w-full"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface to-transparent"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
