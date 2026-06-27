import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Find jobs that actually fit",
    copy: "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
  },
  {
    title: "Know the Company Before You Apply",
    copy: "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    copy: "Keep a clear view of every job you've found, tailored. Your activity and progress all stay in one simple place.",
  },
];

const confidenceFeatures = [
  {
    title: "Understand your match score",
    copy: "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what's missing.",
  },
  {
    title: "AI-Powered Job Matching",
    copy: "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
  },
  {
    title: "Focus on the right roles",
    copy: "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

function Header() {
  return (
    <header className="h-16 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
        <Link href="/" className="flex items-center" aria-label="JobPilot home">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={124}
            height={40}
            priority
            className="h-8 w-auto object-contain"
          />
        </Link>
        <nav className="hidden items-center gap-10 text-sm font-medium text-text-dark md:flex">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/find-jobs">Find Jobs</Link>
          <Link href="/profile">Profile</Link>
        </nav>
        <Link
          href="/login"
          className="rounded-md bg-overlay-dark px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition hover:bg-overlay"
        >
          Start for free
        </Link>
      </div>
    </header>
  );
}

function HeroActions() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/login"
        className="rounded-md bg-overlay-dark px-6 py-3 text-sm font-medium text-accent-foreground shadow-sm transition hover:bg-overlay"
      >
        Get Started <span aria-hidden="true">▶</span>
      </Link>
      <Link
        href="/find-jobs"
        className="rounded-md border border-border bg-surface px-6 py-3 text-sm font-medium text-text-primary shadow-sm transition hover:bg-surface-secondary"
      >
        Find Your First Match
      </Link>
    </div>
  );
}

function GradientBand({
  title,
  copy,
  compact = false,
}: {
  title: string;
  copy: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`border-b border-border bg-[radial-gradient(circle_at_23%_18%,var(--color-hero-pink)_0,transparent_31%),radial-gradient(circle_at_73%_22%,var(--color-hero-blue)_0,transparent_36%),linear-gradient(180deg,var(--color-surface)_0%,var(--color-hero-pink)_100%)] px-6 text-center ${
        compact ? "py-20" : "py-24 md:py-28"
      }`}
    >
      <h1 className="mx-auto max-w-3xl text-[40px] font-bold leading-[1.08] text-text-slate md:text-[56px]">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary">
        {copy}
      </p>
      <div className="mt-8">
        <HeroActions />
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="border-b border-border bg-surface-tertiary px-6 py-14 md:py-16">
      <div className="mx-auto max-w-[1140px]">
        <Image
          src="/images/dashboard-demo.png"
          alt="JobPilot dashboard preview"
          width={2048}
          height={1002}
          priority
          className="w-full rounded-xl object-contain"
        />
      </div>
    </section>
  );
}

function FeatureList({
  items,
  accent = "accent",
}: {
  items: typeof features;
  accent?: "accent" | "success";
}) {
  const borderClass =
    accent === "accent" ? "border-l-accent" : "border-l-success";

  return (
    <div className="divide-y divide-border">
      {items.map((item, index) => (
        <article
          className={`border-l-2 bg-surface px-6 py-8 md:px-8 ${
            index === 0 ? borderClass : "border-l-transparent"
          }`}
          key={item.title}
        >
          <h3 className="text-base font-semibold leading-6 text-text-primary">
            {item.title}
          </h3>
          <p className="mt-3 text-sm font-normal leading-6 text-text-secondary">
            {item.copy}
          </p>
        </article>
      ))}
    </div>
  );
}

function JobsSection() {
  return (
    <section className="grid border-b border-border md:grid-cols-2">
      <div className="border-b border-border bg-surface px-8 py-16 md:border-b-0 md:border-r md:px-16 md:py-20">
        <h2 className="max-w-md text-[38px] font-semibold leading-[1.08] text-text-slate md:text-[44px]">
          Manage Your Job Search With Ease
        </h2>
        <div className="mt-14 -mx-8 md:-mx-16">
          <FeatureList items={features} />
        </div>
      </div>
      <div className="flex items-center justify-center bg-surface-muted px-6 py-16 md:px-8">
        <Image
          src="/images/jobs-lists.png"
          alt="Matched jobs list"
          width={1829}
          height={1367}
          className="w-full max-w-[590px] rounded-xl object-contain"
        />
      </div>
    </section>
  );
}

function ConfidenceSection() {
  return (
    <section className="grid border-b border-border bg-[linear-gradient(135deg,transparent_0,transparent_49%,var(--color-page-grid)_49%,var(--color-page-grid)_51%,transparent_51%)] [background-size:14px_14px] md:grid-cols-2">
      <div className="flex items-center justify-center bg-surface-muted px-8 py-20 md:px-12">
        <Image
          src="/images/agnet-log.png"
          alt="JobPilot agent activity log"
          width={1780}
          height={1376}
          className="w-full max-w-[540px] rounded-xl object-contain"
        />
      </div>
      <div className="bg-surface px-8 py-16 md:px-16 md:py-20">
        <h2 className="max-w-lg text-[38px] font-semibold leading-[1.08] text-text-slate md:text-[44px]">
          Apply With More Confidence, Every Time
        </h2>
        <div className="mt-14 -mx-8 md:-mx-16">
          <FeatureList items={confidenceFeatures} accent="success" />
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="border-b border-border bg-surface px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        Success Stories
      </p>
      <blockquote className="mx-auto mt-6 max-w-4xl text-[28px] font-medium leading-[1.28] text-text-darker md:text-[32px]">
        “I used to spend my evenings copy-pasting resumes. Now I open my
        dashboard to see interviews waiting. It feels like cheating. Had 3
        offers on the table simultaneously.”
      </blockquote>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Image
          src="/images/user-icon.png"
          alt="Tom Wilson"
          width={44}
          height={44}
          className="h-11 w-11 rounded-md object-cover"
        />
        <div className="text-left">
          <p className="text-sm font-semibold leading-5 text-text-primary">
            Tom Wilson
          </p>
          <p className="text-xs font-normal leading-4 text-text-muted">
            Junior Developer
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-surface px-6 py-16">
      <div className="mx-auto flex max-w-[1248px] flex-col items-center justify-between gap-8 md:flex-row">
        <Image
          src="/logo.png"
          alt="JobPilot"
          width={124}
          height={40}
          className="h-9 w-auto object-contain"
        />
        <nav className="flex flex-wrap justify-center gap-8 text-sm font-medium text-text-dark">
          <Link href="/dashboard">Dashboard</Link>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms &amp; Condition</a>
        </nav>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1440px] overflow-hidden border-x border-border bg-surface shadow-sm">
      <Header />
      <GradientBand
        title={"Job hunting is hard. Your tools shouldn’t be."}
        copy="Stop applying blind. JobPilot finds the jobs, researches the companies, and gives you everything you need to stand out."
      />
      <DashboardPreview />
      <JobsSection />
      <ConfidenceSection />
      <Testimonial />
      <GradientBand
        compact
        title="Your next job search can feel a lot less overwhelming"
        copy="Set up your profile, upload your resume, and start finding matches in minutes."
      />
      <Footer />
    </main>
  );
}
