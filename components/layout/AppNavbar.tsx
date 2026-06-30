"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/find-jobs", label: "Find Jobs" },
  { href: "/profile", label: "Profile" },
];

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 h-20 border-b border-border bg-surface">
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-8 md:px-14">
        <Link href="/" className="flex items-center" aria-label="JobPilot home">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={124}
            height={40}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-12 text-base font-medium md:flex">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/find-jobs"
                ? pathname.startsWith("/find-jobs")
                : pathname === item.href;

            return (
              <Link
                className={
                  isActive
                    ? "text-accent"
                    : "text-text-dark transition hover:text-text-primary"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/login"
          className="rounded-md bg-overlay-dark px-8 py-4 text-base font-medium text-accent-foreground shadow-sm transition hover:bg-overlay"
        >
          Start for free
        </Link>
      </div>
    </header>
  );
}
