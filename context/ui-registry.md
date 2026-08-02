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

Now used by three surfaces — login, `error.tsx` and `global-error.tsx` (the last two via
`ErrorState`, which omits the logo). `ComingSoon` dropped out when `AppNavbar` took over its logo and
sign-out, which puts this back at the threshold rather than past it. Extract it when a fourth
chrome-less page appears.

### Uppercase label styles

Three coexist deliberately. They are not interchangeable and must not be merged.

| Style                                                                | Where                                                      |
| -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `text-xs font-medium tracking-widest text-accent uppercase`          | **Section eyebrow** — above a section heading              |
| `text-xs font-medium tracking-wider text-text-muted uppercase`       | **Display field label** — `dl` keys in DossierPreview etc. |
| `text-xs font-semibold tracking-wide text-text-dark uppercase`       | **Form field label** — every `<label>` on a form control   |
| `text-xs font-semibold tracking-wide text-error-dark uppercase`      | **Missing-field tag** — `CompletionIndicator` only         |

A form label has to carry more weight than a read-only one: it is the click target for its control
and the thing a user scans when hunting for the field they still have to fill.

The missing-field tag is the form-label recipe re-coloured on purpose, not a fourth geometry — it
names the same fields the labels do, so it has to read as the same kind of thing.

### Focus states

Two recipes, split by input type. Both are `ring-1 ring-accent`; only the trigger differs.

```
buttons, links, icon buttons:  focus-visible:ring-1 focus-visible:ring-accent focus-visible:outline-none
form controls (fieldSurface):  focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none
```

`focus-visible` on anything clicked, so a mouse press does not leave a ring behind. Plain `focus` on
text controls, where you need to see where you are typing however you got there. `fieldSurface` also
moves its border to accent — a ring alone reads as weaker than the 1px border already drawn.

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

### Form primitives — `components/ui/{field,label,input,textarea,select,checkbox}.tsx`

Hand-written in shadcn's shape on project tokens, for the same reason `Button` was: `shadcn init`
rewrites `globals.css` with its own palette. Every control the profile page needs is a native
element, so no Radix dependency was added either — see `code-standards.md`, "is there a simpler
native solution".

`field.tsx` exports both `Field` (the label + control wrapper) and `fieldSurface`, the shared
control surface that `Input`, `Textarea` and `Select` each extend:

```
w-full rounded-md border border-border bg-surface text-sm text-text-primary transition-colors
placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none
disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted
```

| Component  | Adds                              | Notes                                                        |
| ---------- | --------------------------------- | ------------------------------------------------------------ |
| `Input`    | `h-10 px-3`                       | **Filled controls tint.** See below.                        |
| `Textarea` | `min-h-24 px-3 py-2 leading-6`    | never tints — it is always inside a tinted container         |
| `Select`   | `h-10 appearance-none pr-9 pl-3`  | native `select`; `ChevronDown` `size-4` absolutely positioned |
| `Checkbox` | `size-4 rounded-sm accent-accent` | native checkbox; `accent-accent` keeps it on the one purple  |

**Filled inputs tint, empty ones stay white.** `Input` reads its own `value` and adds
`bg-surface-secondary` when it is non-empty, so the gaps in a long form read at a glance without
any error styling. Only works for controlled inputs — which is every input on this project.

**The tint always inverts against its container.** On a white card, filled inputs are
`bg-surface-secondary`. Inside a `bg-surface-secondary` container (the work-experience card), every
input is forced back to white with `className="bg-surface"`; `cn`'s `twMerge` lets the override win
because `className` is applied last.

`Field` takes an `action` slot rendered to the right of the label on the same row — that is how
"Currently working here" sits beside the END DATE label.

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
Throwaway scaffolding for routes that exist only to prove auth works — delete each usage as features
09 and 14 land. Feature 05 already deleted its `/profile` usage.

**No longer the Auth shell.** It lost its logo and its `SignOutButton` when `AppNavbar` landed above
it — the navbar owns both now, and duplicating them made the page read as two headers. What is left
is the centred card only.

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

| Property      | Class                                                            |
| ------------- | ---------------------------------------------------------------- |
| Button        | `variant` prop, default `secondary`                              |
| Width         | `fullWidth` prop, default `true` → `w-full` + `md` size          |
| Compact       | `fullWidth={false}` → `sm` size, intrinsic width — the navbar    |
| Spacing       | none of its own; the caller passes `className` (lands on the form) |

**Pattern notes:**
Owns the `<form action={signOut}>`, not just the button, so the PostHog capture-then-reset pair
travels with sign-out wherever it moves.

Its one caller is now `AppNavbar`, at `variant="ghost" fullWidth={false}`. The `fullWidth` default
stays `true` for the card layout the auth shell wants, so a future in-card sign-out needs no props.

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

The Auth shell now has three users — login page, `error.tsx`, `global-error.tsx`. `ComingSoon` left
the set when `AppNavbar` took over its chrome. Extract it when a fourth appears.

### Navbar — `components/layout/Navbar.tsx`

`h-16` white bar, `border-b border-border`, logo left, nav centre, primary CTA right.
Takes optional `ctaHref` / `ctaLabel` (default `/login` + "Start for free") so the homepage can
point the CTA at `/dashboard` for a signed-in visitor. `Hero` and `CallToAction` take the same
two props with the same defaults.
Nav items: `text-sm font-medium text-text-dark transition-colors hover:text-accent`.
Nav collapses with `hidden md:flex` — logo and CTA stay visible on mobile.

No active-item styling here, and there will not be — this navbar only ever renders on `/`. The
authenticated pages use `AppNavbar`, which has it.

Nav collapses at `sm`, not `md`. At `md` a signed-in visitor on a 700px window saw no app links at
all and the CTA was the only way in.

Takes `secondaryHref` alongside `ctaHref` — `Hero` and `CallToAction` do too. The secondary button
reads "Find your first match", so signed in it goes to `/find-jobs`, not to the same `/dashboard` as
the primary.

### AppNavbar — `components/layout/AppNavbar.tsx`

File: `components/layout/AppNavbar.tsx`
Last updated: 2026-08-01

The authenticated chrome. Same `h-16 border-b border-border bg-surface` bar and same `h-7 w-auto`
logo as `Navbar`, but no CTA — the nav items sit right and each carries a `size-4` lucide icon
(`LayoutGrid` / `Search` / `User`). The logo links to `/dashboard`, not `/`.

| State    | Classes                                                              |
| -------- | -------------------------------------------------------------------- |
| Active   | `text-accent` + `absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent` |
| Inactive | `text-text-dark hover:text-accent`                                   |

`ui-rules.md` says the active state is a colour change only. The design adds an underline that sits
on the navbar's bottom border — the underline is what makes the active tab legible at a glance on a
long scrolling page, so it is kept and the rule is the one that moved.

**Active item is a prop (`active`), not `usePathname()`.** That keeps this a Server Component; every
page that renders it already knows which item it is.

Labels collapse to icons under `sm`; `aria-current="page"` marks the active item either way.

**Every protected page renders this — `/dashboard`, `/find-jobs` and `/profile`.** It is the only
route between them, so a protected page without it is a dead end. That is not a style preference:
`/dashboard` shipped without it and a signed-in user could not reach `/profile` at all.

**Sign-out lives here**, right of the nav behind a `gap-4 sm:gap-8` split, as
`SignOutButton variant="ghost" fullWidth={false}`. It moved out of `ComingSoon` because those stubs
are deleted by features 09 and 14 and would have taken the app's only sign-out with them. Needs
`userId` for the PostHog capture, so `AppNavbar` takes it too. The design does not draw a sign-out;
this is the feature-14 plan executed early because the alternative was a page with no way out.

`Navbar` (with CTA) still belongs to the homepage. Pages own their chrome — there is no shared
authenticated layout, exactly as feature 01 left it.

### Footer — `components/layout/Footer.tsx`

`border-t border-border bg-surface`, logo + link row, then a `border-t border-border pt-6`
meta row at `text-xs text-text-muted` carrying the copyright and the "Jobs by Adzuna" credit.

### Hero — `components/homepage/Hero.tsx`

Centred stack on `bg-surface` with the dot grid and accent glow layers.

- Eyebrow pill: `inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent shadow-sm`
- Headline: `text-4xl leading-[1.08] font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl`, second line in `text-accent`
- Trust row: `text-xs text-text-muted` with `size-1 rounded-full bg-text-muted` separators

Takes `ctaHref` / `ctaLabel` / `secondaryHref`. The two buttons are **different destinations**, not
one link twice: signed in the primary goes to `/dashboard` and "Find your first match" goes to
`/find-jobs`. They pointed at the same href once and the secondary label was a lie.

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

Takes `ctaHref` / `ctaLabel` / `secondaryHref`, same split as `Hero`.

### CompletionIndicator — `components/profile/CompletionIndicator.tsx`

File: `components/profile/CompletionIndicator.tsx`
Last updated: 2026-08-01

Card recipe, `flex ... sm:items-center sm:justify-between`. Copy left, progress ring right.
Takes `percent` / `missing` / `isComplete` — it computes nothing itself; `lib/completeness.ts` does.

| Property     | Class                                                                             |
| ------------ | --------------------------------------------------------------------------------- |
| Heading      | `flex items-center gap-2 text-base font-semibold text-text-primary`               |
| Status icon  | `size-5 text-error` (`CircleAlert`) / `size-5 text-success` (`CircleCheck`)       |
| Body         | `mt-2 max-w-md text-sm leading-6 text-text-secondary`                             |
| Missing tag  | `rounded-md bg-error/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-error-dark uppercase` |
| Ring numeral | `text-2xl font-bold tracking-tight text-text-primary`                             |

**Ring:** inline `svg`, 120px, `strokeWidth` 10, `-rotate-90` so the arc starts at twelve o'clock,
`strokeLinecap="round"`, `strokeDasharray={circumference}` with
`strokeDashoffset = circumference * (1 - percent / 100)`. Track `stroke-error/15`, fill
`stroke-error`; both swap to `success` at 100%. The numeral is a sibling `absolute inset-0 grid
place-items-center` span, not SVG `<text>` — it inherits the font that way.

The `svg` carries `role="img"` and `aria-label="Profile N% complete"`, and the numeral is
`aria-hidden`, so a screen reader hears the figure once.

**Missing-field tags are `rounded-md`, not pills** — `ui-rules.md`'s pill default is for status and
score badges. These are a checklist, and the design draws them square-ish.

### ResumeUpload — `components/profile/ResumeUpload.tsx`

File: `components/profile/ResumeUpload.tsx`
Last updated: 2026-08-02

Owns the whole Resume card, not just the dropzone: heading, dropzone, extract row, generate row.

| Element         | Class                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| Dropzone        | `flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-border bg-surface-secondary px-6 py-10 text-center` |
| Dragging        | `border-accent bg-accent-muted`                                                           |
| Icon chip       | `grid size-12 place-items-center rounded-full border border-border bg-surface text-accent shadow-sm` |
| Selected file   | `flex items-center gap-3 rounded-xl border border-border bg-surface-secondary px-4 py-3`   |
| Icon-only close | `grid size-8 place-items-center rounded-md text-text-secondary hover:bg-border-light hover:text-text-primary` |

Reuse the icon-only close recipe for any bare icon button.

Takes `resumePath: string | null`. With no resume it shows the dropzone; with one it shows
`ResumePreview` and swaps back to the dropzone while `isReplacing`. Selecting a file uploads
immediately to `POST /api/resume`, then `router.refresh()` — the stored path lives on the
server-rendered row, so the card only updates once the page data is refetched.

**Footer row recipe — one shape, used twice.** Both the extract row and the generate row are
`mt-6 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between`:
explanatory `text-sm text-text-secondary` on the left, an icon + label button on the right with
`sm:shrink-0`. Any future "here is an action related to this card" row uses the same one.

The extract row renders only when `resumePath !== null` — including while a replacement is being
chosen, since the resume it reads is the saved one either way. Its button is
`variant="secondary"` with a `Sparkles` icon, and it swaps its label to "Extracting…" while
`isExtracting` rather than showing a spinner, matching the dropzone's "Uploading…" and
`ProfileForm`'s "Saving…".

**Status banner recipe — shared with `ProfileForm`.** `mt-3 rounded-md border px-3 py-2 text-sm
text-text-primary`, then `border-error/30 bg-error/10` or `border-success/30 bg-success-lightest`,
with `role="alert"` on error and `role="status"` on success. Upload errors and extract status are
deliberately separate state rendered in separate slots — each message sits next to the control that
produced it.

### ResumePreview — `components/profile/ResumePreview.tsx`

File: `components/profile/ResumePreview.tsx`
Last updated: 2026-08-01

| Property         | Class                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Background       | `bg-surface-secondary`                                           |
| Border           | `border border-border`                                           |
| Border radius    | `rounded-xl`                                                     |
| Text — primary   | `text-sm font-medium text-text-primary` (filename)               |
| Text — muted     | `text-xs text-text-muted` (caption)                              |
| Spacing          | `px-4 py-3`, `gap-3`                                             |
| Hover state      | View link `hover:text-accent-dark`                               |
| Shadow           | none                                                             |
| Accent usage     | `text-accent` on the file icon and the View link                 |

**Pattern notes:**
Same row recipe as `ResumeUpload`'s selected-file state — one shape for "a file is attached here".

**View points at `/api/resume`, never at storage.** The route resolves the key from the caller's own
profile row and signs it server-side, so a link can never name someone else's object. This is the
component-level half of the rule in `architecture.md` — the client is never given a key.

The real control is the "Select Resume" `Button variant="secondary"`; the dropzone's `onClick` is a
convenience layered on top and calls `stopPropagation` from the button so one click is not two.
Validation is client-side only and cosmetic — feature 06 must validate type and size again on the
server. `MAX_RESUME_BYTES` lives in `lib/utils.ts` so both share one number.

Errors reuse the login page's banner recipe verbatim, from a message map, never a raw error.

### TagInput — `components/profile/TagInput.tsx`

File: `components/profile/TagInput.tsx`
Last updated: 2026-08-01

| Property         | Class                                                          |
| ---------------- | -------------------------------------------------------------- |
| Background       | chip `bg-surface-secondary`; Add button `bg-surface-secondary`  |
| Border           | none on the chip — the fill carries it                          |
| Border radius    | `rounded-md` (chip and button both)                             |
| Text — primary   | `text-sm font-medium text-text-primary` (chip label)            |
| Text — muted     | `text-text-muted` (the `×`)                                     |
| Spacing          | `gap-2` row, chip `px-3 py-1.5`, chip inner `gap-1.5`, list `pt-1` |
| Hover state      | Add `hover:bg-border-light`; `×` `hover:text-text-primary`      |
| Shadow           | none                                                            |
| Accent usage     | focus ring only                                                 |

**Pattern notes:**
`Field` + `flex gap-2` row (Input, then Add) + a wrapping chip list. Owns only the draft string;
the committed list is lifted to `ProfileForm`.

- Add button: `Button variant="secondary"` overridden to `h-10 shrink-0 bg-surface-secondary hover:bg-border-light` — the design's Add is a filled grey, not the white-with-border secondary.
- Removable chip: `inline-flex items-center gap-1.5 rounded-md bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary`, with an `X` at `size-3.5` in `text-text-muted`.

This chip is **not** the DossierPreview tech-stack chip (`rounded-full`, `text-xs`, display only).
A removable input chip is bigger because it carries a hit target.

`Enter` adds the tag and `preventDefault`s — inside a form it would otherwise submit. Duplicates are
rejected case-insensitively.

### WorkExperienceCard — `components/profile/WorkExperienceCard.tsx`

File: `components/profile/WorkExperienceCard.tsx`
Last updated: 2026-08-01

| Property         | Class                                                        |
| ---------------- | ------------------------------------------------------------ |
| Background       | `bg-surface-secondary` — inverted against the white card      |
| Border           | `border border-border`                                        |
| Border radius    | `rounded-xl`                                                  |
| Text — primary   | inherited from `Input` / `Textarea`                           |
| Text — secondary | `text-sm text-text-dark` ("Currently working here")           |
| Spacing          | `p-5`, `space-y-5` stack, `gap-5` field grid                  |
| Hover state      | remove control `hover:text-error`                             |
| Shadow           | none — the fill separates it, not elevation                   |
| Accent usage     | `accent-accent` on the checkbox; focus ring                   |

**Pattern notes:**
`space-y-5 rounded-xl border border-border bg-surface-secondary p-5`, fully controlled by props.
Every control inside is forced back to `bg-surface` — see the inversion rule under Form primitives.

This is the one place radius nests three deep — card `rounded-xl` → role box `rounded-xl` → input
`rounded-md`. `ui-rules.md` says never stack more than two; the design does, and inverting the fill
(grey box, white inputs) is what keeps the fields legible inside it. Deliberate, and the only
sanctioned exception.

"Currently working here" is a `Checkbox` in the `Field` `action` slot on the END DATE label row.
Checking it nulls `end_date` and disables the control, which then falls through to the shared
`disabled:bg-surface-secondary disabled:text-text-muted`.

**Remove role is an addition, not in the design:** a right-aligned
`text-xs font-medium text-text-secondary hover:text-error` button, rendered only when more than one
role exists. Add role without remove is a dead end.

### ProfileForm — `components/profile/ProfileForm.tsx`

File: `components/profile/ProfileForm.tsx`
Last updated: 2026-08-02

| Property         | Class                                                       |
| ---------------- | ----------------------------------------------------------- |
| Background       | `bg-surface` (card recipe)                                  |
| Border           | `border border-border`; section rule `border-t border-border` |
| Border radius    | `rounded-xl`                                                |
| Text — primary   | `text-base font-semibold` (card title), `text-sm font-semibold` (section) |
| Text — secondary | `text-sm leading-6 text-text-secondary` (lede)              |
| Spacing          | `p-6` card, `space-y-8` sections, `pt-8` above each rule, `gap-5` grid |
| Hover state      | Add role `hover:text-accent-dark`                           |
| Shadow           | `shadow-sm`                                                 |
| Accent usage     | `text-accent` on Add role; primary Save button              |

**Pattern notes:**
A controlled client component on the card recipe — `values` and `setValues` come from
`ProfileWorkspace`; only `status` and `isSaving` are local. Five sections in a `space-y-8`
stack; each is a module-local `Section` — `border-t border-border pt-8`, heading
`text-sm font-semibold text-text-primary`, optional `action` node on the right (that is "+ Add role").

Field grid throughout: `grid gap-5 sm:grid-cols-2`, full-width fields take `sm:col-span-2`.
Save is `Button type="submit" size="lg" className="h-12 w-full"`, disabled and labelled "Saving…"
while the `useTransition` is pending.

**Status banner** above the Save button, `role="alert"` on failure and `role="status"` on success —
the success variant is the error recipe recoloured, and it is the project's only success banner:

```
error:    rounded-md border border-error/30   bg-error/10        px-3 py-2 text-sm text-text-primary
success:  rounded-md border border-success/30 bg-success-lightest px-3 py-2 text-sm text-text-primary
```

Body copy stays `text-text-primary` in both, for the same contrast reason as the login banner.

`email` is pinned by `ProfileWorkspace`, not read from the profile row — on a first save there is no
row to read it from, and the field is disabled because the server always writes the session's address.

**Never key this component on `updated_at`.** It was, so that a save would re-seed state from the
canonical row — but a resume upload writes the same row, the `updated_at` trigger fires,
`router.refresh()` remounts the form and everything typed so far is gone. It also reset the status
banner, so a successful save showed nothing. `saveProfile` returns the normalised values and the form
adopts them with `setValues`; there is no key.

Card heading (`Profile Information`) is `text-base font-semibold`; section headings inside it are
`text-sm font-semibold`. Two levels, matching the type scale — app pages never depart from it.

### ProfileWorkspace — `components/profile/ProfileWorkspace.tsx`

File: `components/profile/ProfileWorkspace.tsx`
Last updated: 2026-08-02

Renders no markup of its own — a fragment holding `ResumeUpload` and `ProfileForm`, so the profile
page's `space-y-6` still applies to both cards as direct children.

**Pattern notes:**
It exists because two cards write to one piece of state: the form's own inputs, and the Extract
button over in the Resume card. This is the lowest node owning both, which is where the state
belongs. Reach for this shape — a stateful, markup-free parent — rather than context, whenever the
two consumers are already adjacent in the tree.

The merge is a spread: extraction returns only the keys the resume spoke to, so named fields win and
unnamed fields keep whatever the user typed. `education` merges key by key rather than wholesale.
Nothing is persisted by any of it — a page refresh restores the saved row, which is what makes
overwriting filled fields safe.

### Profile page — `app/profile/page.tsx`

`AppNavbar` + `main.flex-1.bg-background` + `mx-auto w-full max-w-4xl space-y-6 px-6 py-8`.
`max-w-4xl` rather than the 1440px page container: a form is a reading column, and the design draws
it at roughly 940px in a 1470px viewport.
