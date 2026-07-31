import type { Metadata } from "next";
import "./globals.css";

import { PostHogIdentity } from "@/components/analytics/PostHogIdentity";
import { getSessionUserForAnalytics } from "@/lib/auth";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "JobPilot — Your AI job hunting agent",
  description:
    "JobPilot finds the jobs, scores every one against your real skills, and researches the company before you apply.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUserForAnalytics();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {user ? (
          <PostHogIdentity
            userId={user.id}
            email={user.email}
            name={user.profile?.name}
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
