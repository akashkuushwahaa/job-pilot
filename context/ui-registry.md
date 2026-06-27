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

### Auth Login Card

File: app/login/page.tsx
Last updated: 2026-06-27

| Property         | Class                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Background       | `bg-surface-muted` page, `bg-surface` card, token-based radial gradient on left panel                                   |
| Border           | `border border-border`                                                                                                 |
| Border radius    | `rounded-xl` card, `rounded-md` buttons and alerts, `rounded-full` trust badge, `rounded-sm` provider mark             |
| Text — primary   | `text-text-slate`, `text-[42px] font-bold leading-[1.05]` hero, `text-text-primary`, `text-sm font-medium` button      |
| Text — secondary | `text-text-secondary`, `text-text-muted`, `text-xs leading-5` helper                                                    |
| Spacing          | `px-6 py-16` page body, `p-8 md:p-10` split panels, `mt-8` hero block, `mt-7 space-y-3` actions, `px-4` button         |
| Hover state      | `hover:bg-surface-secondary`                                                                                           |
| Shadow           | `shadow-sm`                                                                                                            |
| Accent usage     | `focus:ring-1 focus:ring-accent`, `border-error text-error` for auth errors                                            |

**Pattern notes:**
Login/auth surfaces use the standard top navbar plus a centered split card on `bg-surface-muted`. The left panel is editorial with a soft token gradient and large headline; the right panel is compact, form-focused, and uses full-width secondary provider buttons.

### Protected Placeholder Card

File: app/dashboard/page.tsx, app/profile/page.tsx, app/find-jobs/page.tsx
Last updated: 2026-06-27

| Property         | Class                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Background       | `bg-background` page, `bg-surface` card                                                     |
| Border           | `border border-border`                                                                      |
| Border radius    | `rounded-xl` card, `rounded-md` buttons                                                     |
| Text — primary   | `text-text-primary`, `text-2xl font-semibold leading-8` heading                             |
| Text — secondary | `text-text-secondary`, `text-xs font-medium uppercase text-accent` label                    |
| Spacing          | `px-6 py-8` page, `p-6` card, `mt-2` text stack, `mt-6` actions                             |
| Hover state      | `hover:bg-surface-secondary`, `hover:bg-accent-dark` for primary action                     |
| Shadow           | `shadow-sm`                                                                                 |
| Accent usage     | `text-accent` section label, `bg-accent text-accent-foreground` primary action              |

**Pattern notes:**
Temporary protected pages use the same white card treatment as future operational screens, keeping them easy to replace with full dashboard/profile/find-jobs UI without changing page chrome.
