import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
] as const;

type Props = {
  ctaHref?: string;
  ctaLabel?: string;
};

export function Navbar({
  ctaHref = "/login",
  ctaLabel = "Start for free",
}: Props = {}) {
  return (
    <header className="w-full border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={496}
            height={168}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-6 sm:flex lg:gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-dark transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href={ctaHref} className={buttonVariants({ size: "md" })}>
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
