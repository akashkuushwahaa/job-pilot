import { Inter } from "next/font/google";

// Shared because global-error.tsx renders its own <html> in place of the root
// layout — it inherits no className, so without this the --font-inter variable
// is undefined there and --font-sans silently falls back to a system font.
export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
