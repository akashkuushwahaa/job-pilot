# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### App Navbar

File: components/layout/AppNavbar.tsx
Last updated: 2026-06-29

| Property         | Class                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Background       | `bg-surface`                                                                                       |
| Border           | `border-b border-border`                                                                           |
| Border radius    | `rounded-md` CTA                                                                                   |
| Text — primary   | `text-text-dark`, `text-base font-medium` nav, `text-accent`, `text-accent-foreground`, `text-base font-medium` CTA |
| Text — secondary | none                                                                                               |
| Spacing          | `h-20`, `px-8 md:px-14`, `gap-12`, `px-8 py-4` CTA                                                 |
| Hover state      | `hover:text-text-primary`, `hover:bg-overlay`                                                       |
| Shadow           | `shadow-sm` CTA                                                                                    |
| Accent usage     | `text-accent` active nav item                                                                       |

**Pattern notes:**
The app navbar is sticky (`sticky top-0 z-10`) and should be used as the persistent top bar for auth and protected app placeholders. It uses the full page max width with the logo left, nav centered, active nav in accent, and dark CTA right.

### Auth Login Card

File: app/login/page.tsx
Last updated: 2026-06-29

| Property         | Class                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Background       | `bg-surface-muted` page, `bg-surface` card, token-based radial gradient on left panel                                   |
| Border           | `border border-border`                                                                                                 |
| Border radius    | `rounded-xl` card, `rounded-md` buttons and alerts, `rounded-full` trust badge, `rounded-sm` trust-badge mark          |
| Text — primary   | `text-text-slate`, `text-[42px] font-bold leading-[1.05]` hero, `text-text-primary`, `text-sm font-medium` button      |
| Text — secondary | `text-text-secondary`, `text-xs leading-5` helper                                                                       |
| Spacing          | `px-6 py-16` page body, `p-8 md:p-10` split panels, `mt-8` hero block, `mt-7 space-y-3` actions, `px-4` button         |
| Hover state      | `hover:bg-surface-secondary`, `hover:bg-overlay` for dark navbar CTA                                                    |
| Shadow           | `shadow-sm`                                                                                                            |
| Accent usage     | `text-accent`, `focus:ring-1 focus:ring-accent`, `border-error text-error` for auth errors                             |

**Pattern notes:**
Login/auth surfaces use `AppNavbar` plus a centered split card on `bg-surface-muted`. The left panel is editorial with a soft token gradient and large headline; the right panel is compact, form-focused, and uses full-width secondary provider buttons.

### Protected Placeholder Card

File: app/dashboard/page.tsx, app/profile/page.tsx, app/find-jobs/page.tsx
Last updated: 2026-06-29

| Property         | Class                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Background       | `bg-background` page, `bg-surface` card                                                     |
| Border           | `border border-border`                                                                      |
| Border radius    | `rounded-xl` card, `rounded-md` buttons                                                     |
| Text — primary   | `text-text-primary`, `text-2xl font-semibold leading-8` heading, `text-base font-medium` button |
| Text — secondary | `text-text-secondary`, `text-base leading-7` body                                           |
| Spacing          | `px-6 py-14` page body, `p-8` card, `mt-4` text stack, `mt-8` actions, `px-6 py-3` buttons  |
| Hover state      | `hover:bg-surface-secondary`, `hover:bg-accent-dark` for primary action                     |
| Shadow           | `shadow-sm`                                                                                 |
| Accent usage     | `text-accent` section label, `bg-accent text-accent-foreground` primary action              |

**Pattern notes:**
Temporary protected pages use `AppNavbar`, a pale `bg-background` page, and a centered white card with concise page copy plus sign-out or navigation actions. Keep this chrome stable until each full feature UI replaces the placeholder card.
