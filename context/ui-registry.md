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

## Shared Primitives

These are used everywhere. Match them before writing new markup.

### Page container

Every full-width section wraps its content in this. Max width and padding come from `ui-rules.md`.

```
mx-auto w-full max-w-[1440px] px-6
```

### Card

The one card recipe. White only — never a coloured card surface.

```
rounded-xl border border-border bg-surface p-6 shadow-sm
```

`rounded-xl` resolves to 16px because `@theme` overrides `--radius-xl`. `shadow-sm` is
byte-identical to the card shadow in `ui-tokens.md`.

### Section rhythm

- Section on page background: `bg-background py-20`
- Section on white: `bg-surface py-20`
- Eyebrow above a section heading: `text-xs font-medium tracking-widest text-accent uppercase`
- Section heading: `text-3xl font-bold tracking-tight text-text-primary sm:text-4xl`
- Section lede: `text-base leading-7 text-text-secondary`

### Auth shell

The centred single-column page used by every chrome-less full-page state — login, and the
`ComingSoon` placeholders. Currently duplicated verbatim in both; extract it into a component the
moment a third page needs it.

```
main:   flex flex-1 items-center justify-center bg-background px-6 py-16
column: w-full max-w-md
logo:   Link → next/image /logo.png at h-7 w-auto, centred
card:   mt-8 + the standard card recipe
```

The logo is `h-7 w-auto` here and in the Navbar — one logo size across the app.

Now used by four surfaces — login, `ComingSoon`, `error.tsx` and `global-error.tsx` (the last two via
`ErrorState`, which omits the logo). Past the "third page" threshold above; extract it next.

### Decorative glow / dot grid

Token colours referenced through `var(--color-*)` inside an arbitrary value — never a hex.
Always on an `aria-hidden` `pointer-events-none absolute` layer.

```
bg-[radial-gradient(55%_100%_at_50%_0%,var(--color-accent-light),transparent)]
bg-[radial-gradient(var(--color-border-muted)_1px,transparent_1px)] [background-size:22px_22px]
```

---

## Components

### Button — `components/ui/button.tsx`

Exports `Button` and `buttonVariants`. Use `buttonVariants({...})` as a `className` on `Link`
when the control navigates; use `Button` when it fires a handler.

Base:

```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium
transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent
disabled:pointer-events-none disabled:opacity-50
```

| Variant     | Classes                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `primary`   | `bg-accent text-accent-foreground hover:bg-accent-dark`                     |
| `secondary` | `bg-surface border border-border text-text-primary hover:bg-surface-secondary` |
| `ghost`     | `text-text-secondary hover:bg-surface-secondary`                            |
| `inverse`   | `bg-surface text-text-primary hover:bg-surface-secondary` — for dark bands  |

| Size | Classes              |
| ---- | -------------------- |
| `sm` | `h-8 px-3 text-xs`   |
| `md` | `h-9 px-4 text-sm`   |
| `lg` | `h-11 px-5 text-sm`  |

Icons inside buttons are `size-4` lucide icons; the base `gap-2` spaces them.

### Login page — `app/(auth)/login/page.tsx`

File: `app/(auth)/login/page.tsx`
Last updated: 2026-07-31

| Property         | Class                                                       |
| ---------------- | ----------------------------------------------------------- |
| Background       | `bg-background` (shell), `bg-surface` (card)                |
| Border           | `border border-border`                                      |
| Border radius    | `rounded-xl` (card), `rounded-md` (error banner)            |
| Text — primary   | `text-base font-semibold text-text-primary` (heading)       |
| Text — secondary | `text-sm leading-6 text-text-secondary` (lede)              |
| Text — muted     | `text-xs leading-5 text-text-muted` (legal footnote)        |
| Spacing          | `px-6 py-16` shell, `p-6` card, `mt-6` blocks, `gap-3` stack |
| Hover state      | none — inherited from `Button`                              |
| Shadow           | `shadow-sm`                                                 |
| Accent usage     | none                                                        |

**Pattern notes:**
Uses the **Auth shell** primitive. No Navbar, no Footer — the `(auth)` group has no chrome.
Heading is `text-base`, the documented section-heading step — not `text-xl`. App pages stay on the
type scale in `ui-tokens.md`; only the landing page departs from it.

**Error banner** (`role="alert"`) — the project's error recipe, reuse it everywhere:

```
rounded-md border border-error/30 bg-error/10 px-3 py-2 text-sm text-text-primary
```

Body copy stays `text-text-primary` rather than `text-error`: #EF4444 on the tinted background is
about 3.7:1, under the 4.5:1 AA floor for body text. The error token carries the signal through the
border and fill. Copy always comes from a message map — never a raw error string.

Brand marks are module-local inline `svg` at `className="size-4" fill="currentColor"` — lucide
carries no brand icons, and `currentColor` keeps them on-token with no hex.

### OAuthButton — `components/auth/OAuthButton.tsx`

File: `components/auth/OAuthButton.tsx`
Last updated: 2026-07-31

| Property         | Class                                                        |
| ---------------- | ------------------------------------------------------------ |
| Background       | inherited — `Button` `variant="secondary"`                   |
| Border           | inherited — `border border-border`                           |
| Border radius    | inherited — `rounded-md`                                     |
| Text — primary   | inherited — `text-sm text-text-primary`                      |
| Spacing          | `size="lg"` → `h-11 px-5`, full width via `className="w-full"` |
| Hover state      | inherited — `hover:bg-surface-secondary`                     |
| Disabled state   | inherited — `disabled:pointer-events-none disabled:opacity-50` |
| Shadow           | none                                                         |
| Accent usage     | none                                                         |

**Pattern notes:**
`useFormStatus` disables the button and swaps the label to "Connecting to X…" while the Server
Action runs. Takes `icon` as a rendered element, not a component — client component props must be
serializable.

Takes `provider` as well as `label`. They look redundant but are not: `label` is display copy and
`provider` is the analytics dimension on `oauth_sign_in_started`. Deriving one from the other would
silently re-key the funnel the first time the copy is reworded.

Spinner is CSS, since lucide 1.28 ships no loader icon:

```
size-4 animate-spin rounded-full border-2 border-current border-t-transparent
```

`border-current` inherits the button's text colour, so it needs no token of its own. Reuse this
spinner for any pending button rather than adding a spinner dependency.

### ComingSoon — `components/layout/ComingSoon.tsx`

File: `components/layout/ComingSoon.tsx`
Last updated: 2026-07-31

| Property         | Class                                                      |
| ---------------- | ---------------------------------------------------------- |
| Background       | `bg-background` (shell), `bg-surface` (card)               |
| Border           | `border border-border`, divider `border-t border-border`   |
| Border radius    | `rounded-xl`                                               |
| Text — primary   | `text-base font-semibold text-text-primary` (heading)      |
| Text — secondary | `text-sm leading-6 text-text-secondary`                    |
| Text — muted     | `text-xs font-medium tracking-wider text-text-muted uppercase` (`dt`) |
| Spacing          | `px-6 py-16` shell, `p-6` card, `mt-6` blocks, `pt-6` divider |
| Hover state      | none — inherited from `Button`                             |
| Shadow           | `shadow-sm`                                                |
| Accent usage     | `text-xs font-medium tracking-widest text-accent uppercase` (eyebrow) |

**Pattern notes:**
Uses the **Auth shell** primitive. Throwaway scaffolding for routes that exist only to prove auth
works — delete each usage as features 05, 09 and 14 land.

Two uppercase label styles coexist deliberately and must not be merged: `tracking-widest` +
`text-accent` is the **section eyebrow**; `tracking-wider` + `text-text-muted` is a **field label**
(same as `DossierPreview`).

Sign-out uses `Button variant="secondary"` at the default `md` size, not `lg` — it is a secondary
action inside a card, whereas the login page's provider buttons are the primary action on the page.

The sign-out form is no longer inline here — it is `SignOutButton` below. `ComingSoon` itself is a
Server Component again.

### SignOutButton — `components/auth/SignOutButton.tsx`

File: `components/auth/SignOutButton.tsx`
Last updated: 2026-07-31

| Property      | Class                                                  |
| ------------- | ------------------------------------------------------ |
| Button        | `Button variant="secondary"`, default `md` size        |
| Width         | `w-full` — fills its container                         |
| Spacing       | none of its own; the caller passes `className`         |

**Pattern notes:**
Owns the `<form action={signOut}>`, not just the button, so the PostHog capture-then-reset pair
travels with sign-out wherever it moves. Visually identical to the inline form it replaced.
Full-width by default because both current callers are inside the **Auth shell** card; give it a
width-constraining wrapper if it ever lands in a navbar.

### ErrorState — `components/layout/ErrorState.tsx`

File: `components/layout/ErrorState.tsx`
Last updated: 2026-07-31

| Property         | Class                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Background       | `bg-background` (shell), `bg-surface` (card)                         |
| Border           | `border border-border`, divider `border-t border-border`             |
| Border radius    | `rounded-xl`                                                         |
| Text — primary   | `text-base font-semibold text-text-primary` (heading)                |
| Text — secondary | `text-sm leading-6 text-text-secondary`                              |
| Text — muted     | `text-xs font-medium tracking-wider text-text-muted uppercase` (`dt`) |
| Spacing          | `px-6 py-16` shell, `p-6` card, `mt-6` blocks, `pt-6` divider        |
| Shadow           | `shadow-sm`                                                          |
| Accent usage     | `text-xs font-medium tracking-widest text-accent uppercase` (eyebrow) |

**Pattern notes:**
Shared by `app/error.tsx` and `app/global-error.tsx`. Same **Auth shell** recipe and the same two
uppercase label styles as `ComingSoon` — eyebrow vs field label, still not to be merged.

The error eyebrow is `text-accent`, not `text-error`. `--color-error` is reserved for inline
validation and destructive actions; a full-page error state is chrome, not a field-level warning.

**The Auth shell now has four users** — login page, `ComingSoon`, `error.tsx`, `global-error.tsx`.
That is past the extraction threshold this file set. Extract it into a component in the next session
that touches any of them.

### Navbar — `components/layout/Navbar.tsx`

`h-16` white bar, `border-b border-border`, logo left, nav centre, primary CTA right.
Takes optional `ctaHref` / `ctaLabel` (default `/login` + "Start for free") so the homepage can
point the CTA at `/dashboard` for a signed-in visitor. `Hero` and `CallToAction` take the same
two props with the same defaults.
Nav items: `text-sm font-medium text-text-dark transition-colors hover:text-accent`.
Nav collapses with `hidden md:flex` — logo and CTA stay visible on mobile.

Active-item styling (`text-accent`) is **not** implemented yet — it needs `usePathname` and
lands when the first authenticated page exists.

### Footer — `components/layout/Footer.tsx`

`border-t border-border bg-surface`, logo + link row, then a `border-t border-border pt-6`
meta row at `text-xs text-text-muted` carrying the copyright and the "Jobs by Adzuna" credit.

### Hero — `components/homepage/Hero.tsx`

Centred stack on `bg-surface` with the dot grid and accent glow layers.

- Eyebrow pill: `inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent shadow-sm`
- Headline: `text-4xl leading-[1.08] font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl`, second line in `text-accent`
- Trust row: `text-xs text-text-muted` with `size-1 rounded-full bg-text-muted` separators

### ProductPreview — `components/homepage/ProductPreview.tsx`

`dashboard-demo.png` in a framed card, `max-w-5xl`, accent glow behind, and a
`bg-gradient-to-t from-surface` fade over the bottom 28 units of the image.

### HowItWorks — `components/homepage/HowItWorks.tsx`

Three value-prop cards, `grid gap-6 md:grid-cols-3`, on `bg-background`.
Icon chip: `grid size-10 place-items-center rounded-lg bg-accent-muted text-accent`.
Step number: `text-xs font-medium text-text-muted`, right-aligned against the icon.
Card title: `text-base font-semibold text-text-primary`. Body: `text-sm leading-6 text-text-secondary`.

### Features — `components/homepage/Features.tsx`

Two alternating `grid items-center gap-12 lg:grid-cols-2` splits separated by `mt-28`.
Second split reverses on desktop with `order-last lg:order-first` on the visual.

Checklist item (module-local `PointList`):

```
flex items-start gap-3 text-sm leading-6 text-text-secondary
└ marker: mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-muted text-accent
```

Framed screenshot gets an offset backdrop panel: `absolute -inset-4 rounded-xl bg-surface-tertiary`.

### DossierPreview — `components/homepage/DossierPreview.tsx`

Static mock of the company-research dossier, built in JSX rather than shipped as a screenshot.
Card recipe + `dl` sections. Field label: `text-xs font-medium tracking-wider text-text-muted uppercase`.

- Tech-stack chip: `rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-dark`
- Status badge: `rounded-full bg-success-lightest px-2 py-0.5 text-xs font-medium text-success-foreground`
- Highlighted question: `rounded-lg bg-accent-muted px-3 py-2 text-sm leading-6 text-accent`

Reuse these three when building the real Company Research card in feature 12/13.

### Testimonial — `components/homepage/Testimonial.tsx`

Single `figure` on the card recipe, `max-w-4xl`, padding steps up to `sm:p-10`.
Quote: `text-xl leading-9 font-medium text-text-primary sm:text-2xl sm:leading-10`.
Avatar: `size-10 rounded-full object-cover`, sat above a `border-t border-border pt-6` caption.

### CallToAction — `components/homepage/CallToAction.tsx`

The only dark surface on the page: `rounded-xl bg-overlay px-6 py-16 text-center sm:px-16`,
with an accent radial glow at `opacity-40 blur-2xl`.

On dark, light text comes from the surface token, not a new colour:
`text-surface` for the heading, `text-surface/70` for body copy.
Secondary button on dark overrides ghost with `border border-surface/20 text-surface hover:bg-surface/10`.
