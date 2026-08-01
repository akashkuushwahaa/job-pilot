import Image from "next/image";
import Link from "next/link";
import { LayoutGrid, Search, User } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutGrid,
  },
  { key: "find-jobs", label: "Find Jobs", href: "/find-jobs", icon: Search },
  { key: "profile", label: "Profile", href: "/profile", icon: User },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

type Props = {
  active: NavKey;
  userId: string;
};

// The authenticated chrome. Every protected page renders this — it is the only
// route between them, so a page without it is a dead end.
//
// The active item is a prop rather than a usePathname() read so this stays a
// Server Component; every page that renders it already knows which one it is.
export function AppNavbar({ active, userId }: Props) {
  return (
    <header className="w-full border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.png"
            alt="JobPilot"
            width={496}
            height={168}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="flex h-full items-center gap-4 sm:gap-8">
          <nav className="flex h-full items-center gap-4 sm:gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex h-full items-center gap-2 text-sm font-medium transition-colors",
                    isActive ? "text-accent" : "text-text-dark hover:text-accent",
                  )}
                >
                  <item.icon aria-hidden className="size-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <SignOutButton userId={userId} variant="ghost" fullWidth={false} />
        </div>
      </div>
    </header>
  );
}
