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

### Card — list variant

A card whose contents run edge to edge: table rows separated by full-width rules, and a footer
divided by one. Same recipe with the padding dropped and `overflow-hidden`, so the rows are clipped
by the radius instead of poking through it. Padding moves onto the cells (`px-6 py-4`).

```
overflow-hidden rounded-xl border border-border bg-surface shadow-sm
```

### Input with a leading icon

Same relative/absolute shape `Select` uses for its chevron, mirrored to the left. The icon is
`aria-hidden` and `pointer-events-none` so the whole field stays one click target.

```
wrapper: relative
icon:    pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted
input:   Input className="pl-9"   — twMerge lets pl-9 beat the base px-3
```

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
| `text-xs font-medium tracking-wider text-text-secondary uppercase`   | **Table column header** — every `th` in `JobsTable`         |

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

**Footer row recipe — one shape, used twice.** Both the extract row and the generate row are a
`mt-6 border-t border-border pt-6` wrapper holding a
`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` control line: explanatory
`text-sm text-text-secondary` on the left, an icon + label button on the right with `sm:shrink-0`.
Messages hang below the control line, inside the wrapper. Any future "here is an action related to
this card" row uses the same one.

The extract row renders only when `resumePath !== null` — including while a replacement is being
chosen, since the resume it reads is the saved one either way. Its button is
`variant="secondary"` with a `Sparkles` icon, and it swaps its label to "Extracting…" while
`isExtracting` rather than showing a spinner, matching the dropzone's "Uploading…" and
`ProfileForm`'s "Saving…". The generate row is always rendered, primary variant, `FileText` icon,
and swaps to "Generating…" the same way.

**Inline confirm recipe — no dialog primitive.** Generating replaces the one stored resume and
cannot be undone, so with a resume already stored the button does not act: it swaps the row into a
confirm state. The left-hand text becomes the consequence ("This replaces your stored resume. It
cannot be undone.") and the single button becomes `Cancel` (secondary) + `Replace resume` (primary)
in a `flex gap-2 sm:shrink-0`. Reach for this rather than a modal whenever a destructive action
needs a second beat — the card already has the user's attention and `ui-rules.md` has no dialog.

**Disabled-with-a-reason.** A disabled button that does not say why reads as broken. `Generate`
takes `generateBlocker: "incomplete" | "unsaved" | null` from `ProfileWorkspace` and renders the
matching sentence as `mt-3 text-xs text-text-muted` under the row. Small, muted, permanent — it is a
condition, not an event, so it is not a status banner.

**Status banner recipe — shared with `ProfileForm`.** `mt-3 rounded-md border px-3 py-2 text-sm
text-text-primary`, then `border-error/30 bg-error/10` or `border-success/30 bg-success-lightest`,
with `role="alert"` on error and `role="status"` on success. Upload errors, extract status and
generate status are three deliberately separate pieces of state in three separate slots — each
message sits next to the control that produced it.

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

It also holds `savedValues`, a second copy of the form values seeded from the same server-rendered
row and replaced by whatever a save normalised (`ProfileForm` reports it up through `onSaved`).
`isSameFormValues` in `lib/profile.ts` compares the two field by field — not by `JSON.stringify`,
because a work-experience entry reaches the form from `EMPTY_ROLE`, from extraction, and from a jsonb
column that returns its keys in Postgres's own order, so identical roles can serialise differently.

**Any card action that reads the saved row needs this snapshot.** The form is routinely ahead of the
database — that is the entire point of extraction — so an action that silently reads the row while
the user is looking at unsaved values produces a result they cannot account for. `generateBlocker`
is computed here and passed down as a reason, not a boolean.

### SearchControls — `components/find-jobs/SearchControls.tsx`

File: `components/find-jobs/SearchControls.tsx`
Last updated: 2026-08-02

| Property         | Class                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Background       | `bg-surface` (card recipe)                                         |
| Border           | `border border-border`                                             |
| Border radius    | `rounded-xl` (card), `rounded-lg` (banner)                         |
| Text — primary   | inherited from `Input`                                             |
| Text — success   | `text-sm text-success-foreground` (banner copy)                    |
| Spacing          | `p-6` card, `gap-4` field row, `mt-4 px-4 py-3` banner             |
| Hover state      | inherited from `Button`                                            |
| Shadow           | `shadow-sm`                                                        |
| Accent usage     | primary `Find Jobs` button                                         |

**Pattern notes:**
`grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end` — two `Field`s and the button on one row.
`items-end` is what lines the button up with the input bottoms, since the button has no label above
it. JOB TITLE uses the leading-icon input; LOCATION does not, matching the design.

**Buttons on a field row state their own height.** `Button` size `md` is `h-9` while every form
control is `h-10`, so `Find Jobs` carries `className="h-10 px-5"`. Changing `md` to `h-10` globally
was considered and declined — it would move every button in the app to fix one row.

**Search-result banner** — the third variant of the status-banner family, and the only one that is
not `text-text-primary`:

```
flex items-center gap-2 rounded-lg border border-success/30 bg-success-lightest px-4 py-3 text-sm text-success-foreground
└ icon: Sparkles size-4 shrink-0 text-success
```

`text-success-foreground` (#007A55) on `bg-success-lightest` measures 5.4:1, and `ui-tokens.md`
already pairs those two for matched-skill badges — so the design's green copy is on-token and above
the AA floor. The error banner cannot do the same because `--color-error` has no accessible pair.
`role="status"`, since the message reports the result of an action the user asked for.

**Feature 10 — the card became a Client Component and grew three more states.** The banner is now
two-variant, sharing the shape above but swapping the colour set, exactly as `ResumeUpload`'s two
banners do:

```
mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm
├ success: border-success/30 bg-success-lightest text-success-foreground  + Sparkles icon
└ error:   border-error/30   bg-error/10          text-text-primary       (no icon)
```

- **A disabled control states its reason as muted text.** `mt-3 text-xs text-text-muted`, directly
  under the row — the same treatment and the same class string as the Generate blocker in
  `ResumeUpload`. This is now the project's pattern for any gated action: the disabled state and the
  sentence explaining it always travel together.
- **The in-flight line replaces the banner rather than sitting beside it.** `mt-4 text-sm
  text-text-secondary`, `role="status"`, and the previous result is hidden while `isSearching` — a
  stale "Found 8 jobs" above a live spinner reads as the current answer.
- The field row is now a `<form>` with `onSubmit`, so Enter in either input runs the search. The
  submit button is disabled on an empty job title, which is the same condition the route validates.

### JobFilters — `components/find-jobs/JobFilters.tsx`

File: `components/find-jobs/JobFilters.tsx`
Last updated: 2026-08-02 (feature 11)

| Property         | Class                                                     |
| ---------------- | --------------------------------------------------------- |
| Background       | `bg-surface`                                              |
| Border           | `border border-border`; divider `bg-border`               |
| Border radius    | `rounded-xl`                                              |
| Text             | inherited from `Input` / `Select`                         |
| Spacing          | `px-4 py-3`, `gap-4` row, `gap-3` between the two selects |
| Shadow           | `shadow-sm`                                               |
| Accent usage     | focus ring only                                           |

**Pattern notes:**
A bar, not a form: `flex flex-col gap-4 … sm:flex-row sm:items-center`, filter input on `flex-1`,
then a divider, then the two selects.

- **Borderless input inside a bordered card.** `Input className="border-transparent pl-9"` — the
  card's own border is the one the user sees, and `focus:border-accent` still fires on focus, so the
  field does not lose its focus affordance. Use this whenever a control fills a card edge to edge.
- **Vertical divider:** `hidden h-8 w-px shrink-0 bg-border sm:block`, `aria-hidden`. It disappears
  with the row at `sm` because a horizontal rule between stacked controls reads as a section break.
- **Select as a button.** `Select className="w-auto font-medium"` — `w-auto` beats `fieldSurface`'s
  `w-full` through twMerge, and the heavier weight is what makes it read as a control rather than a
  field. Both selects are labelled with `aria-label`; the design draws no visible label.

**Feature 11 — a Client Component, and the markup did not change.** Feature 09 wrote the option
values as the filter and sort keys, so wiring it added handlers and nothing else.

- **The URL is the state.** It takes one `query: JobQuery` prop and writes back through
  `router.replace(jobsHref(...))`. Nothing is held in component state, so the server read and the
  controls cannot disagree. Reach for this on any control that changes what a Server Component reads.
- **`replace`, not `push`.** A filter bar that stacks a history entry per keystroke turns the back
  button into a way to un-type. Pagination is the opposite and pushes — see `JobsPagination`.
- **The two selects are controlled; the text input is not.** A controlled `<select>` re-renders in
  place, so it stays in step with the URL at no cost. The text input is `defaultValue` and is never
  re-seeded: its 300ms debounced `replace` lands while the user is still typing, so a value fed back
  from the server would race the keyboard and drop characters. This split is deliberate — do not
  "fix" the input into a controlled one.
- **Every change resets `page` to 1.** A filter that narrows the list to two pages while the URL says
  `page=5` would otherwise land on nothing.

### JobsTable — `components/find-jobs/JobsTable.tsx`

File: `components/find-jobs/JobsTable.tsx`
Last updated: 2026-08-02

| Property         | Class                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Background       | transparent — the page wraps it in the list-variant card             |
| Border           | `border-b border-border` per row, `last:border-b-0`                  |
| Text — header    | `text-xs font-medium tracking-wider text-text-secondary uppercase`   |
| Text — primary   | `text-sm text-text-primary` (role, salary), `font-semibold` (company) |
| Text — secondary | `text-sm text-text-secondary` (date found)                           |
| Text — muted     | `text-sm text-text-muted` (missing salary, empty state)              |
| Spacing          | `px-6 py-4` every cell, header included                              |
| Hover state      | `hover:bg-surface-secondary` on the row                              |
| Accent usage     | none — score colour comes from success / info / warning              |

**Pattern notes:**
A real `<table>` inside `overflow-x-auto`, `w-full min-w-[720px]`. Five columns; there is no SOURCE
column — see the correction note in `build-plan.md`.

- **Company chip:** `grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-secondary text-text-secondary` with a `Building2` at `size-4`. Reuse for any "logo goes here" slot until real logos exist.
- **Match score bar:** track `h-1 w-24 shrink-0 overflow-hidden rounded-full bg-border-light lg:w-32`, fill `block h-full rounded-full` + `matchScoreFill(score)` from `lib/utils.ts`. The track is `aria-hidden` because the percentage sits right beside it — one reading, not two.
- **The fill width is the project's only inline style.** A percentage is a value, not a token, so it
  cannot be a class. `code-standards.md`'s no-inline-styles rule is about styling; this is data.
- **Feature 12 — the row is a link now, and it is one link, not five.** A `<tr>` cannot wrap an
  `<a>` around its cells, so the company name is the real link and a pseudo-element stretches it over
  the row: `<tr class="relative">` is the containing block, and the link carries
  `before:absolute before:inset-0 before:content-['']`. Reuse this whenever a whole block should be
  clickable but the markup cannot nest an anchor.
  - **The link's accessible name is "Company — Title".** The visible text is the company alone, which
    is not a link name a screen-reader user can act on when six rows share an employer, so the title
    follows in an `sr-only` span.
  - **Killing the outline means replacing it.** `focus-visible:outline-none` on a stretched link
    would leave keyboard focus invisible — `focus-within:bg-surface-secondary` is a 1.04:1 change and
    is not an indicator. The ring moves onto the pseudo-element instead:
    `focus-visible:before:ring-1 focus-visible:before:ring-accent focus-visible:before:ring-inset`.
  - **`prefetch={false}`, and it is not optional.** The page renders up to twenty rows and
    `/find-jobs/[id]` is a protected dynamic route, so the default prefetch turns scrolling the list
    into twenty `requireUser()` calls and twenty job reads. **Any row link into an authenticated
    dynamic route gets this**; the route's `loading.tsx` is what keeps the click immediate instead.

**Empty state** — `ui-rules.md`'s recipe, icon above muted text, no CTA (the CTA is the search card
already on the page):

```
wrapper: flex flex-col items-center px-6 py-16 text-center
icon:    grid size-12 place-items-center rounded-full border border-border bg-surface-secondary text-text-muted
copy:    mt-4 max-w-sm text-sm text-text-muted
```

**Feature 11 — one empty state, two sentences.** The recipe is unchanged; a `filtered` prop picks
the copy. "No jobs yet, go and search" is the wrong thing to tell someone who has fifty saved jobs
and a filter that excludes them all, so the filtered variant points at the filter bar instead. Still
no CTA — the bar is directly above and is itself the way out. **Any list that can be empty for two
different reasons needs two sentences**, not one that is true half the time.

### JobsPagination — `components/find-jobs/JobsPagination.tsx`

File: `components/find-jobs/JobsPagination.tsx`
Last updated: 2026-08-02

| Property         | Class                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Border           | `border-t border-border` — it is the list card's footer            |
| Text — secondary | `text-sm text-text-secondary` ("Showing … results")                |
| Text — primary   | `font-semibold text-text-primary` (the three numerals)             |
| Spacing          | `px-6 py-4`, `gap-2` between controls                              |
| Accent usage     | current page — `border-accent/30 bg-accent-muted text-accent hover:bg-accent-light` |

**Pattern notes:**
Takes `query: JobQuery` / `totalResults` and derives the page count itself, so the count sentence
and the page buttons cannot disagree. Page buttons are squared off with `w-9 px-0`; the current one
is that same button re-coloured and carries `aria-current="page"`. Every one also carries
`aria-label="Page N"` — a bare numeral is not a label.

Page numbers are first, last, and a three-wide window: `1 2 3 … 8` at page 1, `1 … 4 5 6 … 8` at
page 5, `1 … 5 6 7 8` at page 8, and no ellipsis at all under six pages. Previous is disabled on
the first page and Next on the last, which is a real state rather than missing logic.

**Feature 11 — link or disabled button, decided per control.** The module-local `PageControl` takes
`href: string | null` and is the registry's rule made mechanical: a control that navigates is a
`Link` carrying `buttonVariants({ variant: "secondary" })`; a control with nowhere to go is a
disabled `Button`. Previous on page one has no href because there is no such page, and an `<a>`
cannot express that. Reuse this shape wherever navigation and a disabled state coexist.

- **`pageSize` is no longer a prop.** It imports `JOBS_PAGE_SIZE` from `lib/jobs.ts`, the same
  constant the read pages on. A page size passed in can disagree with the one the query used; a
  shared constant cannot.
- **Every href carries the whole query**, built by `jobsHref`, so paging never silently drops the
  filter that produced the list. These are the page's only `push` navigations — moving between pages
  is a step a user expects the back button to walk.

### Find Jobs page — `app/find-jobs/page.tsx`

`AppNavbar` + `main.flex-1.bg-background` + the shared page container
`mx-auto w-full max-w-[1440px] space-y-6 px-6 py-8`. Three stacked cards — search controls, filter
bar, and the list-variant card holding `JobsTable` + `JobsPagination` — then the "Jobs by Adzuna"
credit at `text-xs text-text-muted`.

Unlike `/profile`, this page uses the full 1440px container: a table is scanned across, not read
down a column.

**Two Client Components, and only two.** Feature 09 shipped none; feature 10 made `SearchControls`
one and feature 11 made `JobFilters` one. `JobsTable` and `JobsPagination` stayed on the server —
pagination navigates with `Link`, so it needs no JavaScript to work.

**The page owns the query, the components render it.** `parseJobQuery(await searchParams)` normalises
the URL, `fetchJobPage` reads against it, and the resolved page number is folded back into one
`listQuery` object that `JobFilters` and `JobsPagination` both take. Passing the *resolved* page —
not the requested one — is what keeps a clamped `?page=99` from showing controls that disagree with
the rows underneath them.

### JobInfo — `components/job-details/JobInfo.tsx`

File: `components/job-details/JobInfo.tsx`
Last updated: 2026-08-02 (feature 12)

| Property         | Class                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Background       | `bg-surface` (card recipe, both cards)                             |
| Border           | `border border-border`                                             |
| Border radius    | `rounded-xl` (cards), `rounded-lg` (fact chips)                    |
| Text — primary   | `text-2xl font-bold text-text-primary sm:text-3xl` (job title)     |
| Text — secondary | `text-sm text-text-secondary` (company)                            |
| Text — muted     | `text-xs font-medium tracking-wider text-text-muted uppercase` (fact label) |
| Spacing          | `p-6` header card, `p-4` fact cards, `gap-4` grid and rows         |
| Shadow           | `shadow-sm` on both                                                 |
| Accent usage     | job-type chip `bg-accent-muted text-accent`                        |

**Pattern notes:**
Renders **two** cards from one component — the identity card and the four-fact grid — as a fragment,
so the page's `space-y-6` still puts 24px between them. Same shape as `ProfileWorkspace`: a component
that owns a slice of the page rather than exactly one box.

- **Company chip, large variant:** `grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-surface-secondary text-text-secondary` with `Building2` at `size-6`. The `JobsTable` `size-9` chip is the same recipe one step down; use this one wherever the company is the subject of the page.
- **Fact grid:** `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`, each card `flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm`. Value above label — `text-sm font-semibold text-text-primary` over the display-field-label recipe.
- **Fact icon chips are tinted per fact, never per score:** salary `bg-success-lightest text-success-foreground`, location `bg-info-lightest text-info-foreground`, job type `bg-accent-muted text-accent`, date found `bg-surface-secondary text-text-secondary`. All `size-9 rounded-lg` with a `size-4` lucide icon.
- **The match badge is a status badge, not a score bar.** `matchBadge()` in `lib/utils.ts` keys on `MATCH_THRESHOLD` (`bg-success-lightest text-success-foreground` at or above, `bg-surface-secondary text-text-secondary` below), which is why the design draws 85% green while `matchScoreFill()` paints an 85 bar blue. **Do not collapse the two functions** — the bar reports where in the range a score sits, the badge reports whether it cleared the bar.
- **An absent fact is an em dash with an `sr-only` replacement.** The design draws `—`, which reads aloud as "em dash"; `<span aria-hidden>—</span><span className="sr-only">Not stated</span>` keeps the drawing and the announcement both correct. Reuse for any "—" that stands in for missing data.
- The value line is `truncate` inside a `min-w-0` column, which is what lets a long location render as the design's "Newark, Ess…" rather than blowing the grid out.

### MatchScore — `components/job-details/MatchScore.tsx`

File: `components/job-details/MatchScore.tsx`
Last updated: 2026-08-02 (feature 12)

Two cards, again as a fragment: the reasoning paragraph and the two skill lists.

| Element        | Class                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Card eyebrow   | `text-xs font-medium tracking-wider text-text-secondary uppercase`     |
| Icon chip      | `grid size-9 place-items-center rounded-lg bg-success-lightest text-success` |
| Paragraph      | `mt-5 text-sm leading-7 text-text-primary`                            |
| List label     | `mt-5 text-sm text-text-secondary` ("You have" / "Gap skills")        |
| Skill chip     | `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium` |

**Pattern notes:**

- **Skill chip colours come straight from `ui-tokens.md`'s Skills Badges table** — matched
  `bg-success-lightest text-success-foreground` with a `Check`, missing `bg-accent-muted text-accent`
  with an `X`, both icons `size-3.5`. `build-plan.md` feature 12 says "missing skills as red/orange
  badges"; the tokens and the design both say purple, and two sources beat one. **Missing skills are
  not an error state** — they are the gap the company-research dossier turns into a strategy.
- **A card with nothing to say does not render.** No `match_reason` → no reasoning card; both skill
  arrays empty → no skills card. An empty-but-present card is a heading over blank space, which reads
  as a broken page rather than as a job the model had little to say about.
- **Eyebrow, not heading.** These two cards carry an uppercase label; `JobDescription` and
  `CompanyResearch` carry a `text-base font-semibold` title. The split is deliberate — a label sits
  over content, a title names a section the user might link to.

### JobDescription — `components/job-details/JobDescription.tsx`

File: `components/job-details/JobDescription.tsx`
Last updated: 2026-08-02 (feature 12)

| Element        | Class                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| Card           | the standard card recipe                                                 |
| Icon chip      | `grid size-9 place-items-center rounded-lg bg-surface-secondary text-text-secondary` |
| Card title     | `text-base font-semibold text-text-primary`                              |
| Body           | `mt-5 text-sm leading-7 text-text-primary`                               |
| Sub-heading    | `text-sm font-semibold text-text-primary`                                |
| Bullet         | `flex items-start gap-3 text-sm leading-6 text-text-primary` + `mt-2 size-1.5 shrink-0 rounded-full bg-text-muted` marker |

**Pattern notes:**
**Every section is conditional and the whole card can return `null`.** Adzuna returns a 500-character
snippet, so feature 10 stores it in `about_role` verbatim and leaves `responsibilities`,
`requirements`, `nice_to_have`, `benefits` and `about_company` empty on every row discovered so far —
confirmed against all 20 live rows. Four empty headings would advertise data the product does not
have. The section list is built then `.filter`ed on length, so adding a source that does fill them
needs no other change.

The bullet marker is a `size-1.5` dot rather than a list-style disc, matching `Features.tsx`'s
`PointList` shape at a smaller step.

**Truncation note — added after the first browser pass.** The paragraph stops mid-word on every job,
because Adzuna's snippet does; an unexplained `…` under a heading that says "Job Description" is
indistinguishable from a broken renderer, and was reported as one. Nothing in this component
truncates. When `isTruncatedDescription(job.about_role)` is true it renders **ResumeUpload's
footer-row recipe** — `mt-6 border-t border-border pt-6` around a
`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between` line, explanatory
`text-sm text-text-secondary` left, `Button variant="secondary"` with an `ExternalLink` right at
`sm:shrink-0`. The registry reserves that recipe for exactly this shape, so no new pattern was added.

The link is dropped when `source_url` is null; the sentence alone still explains the ellipsis.
**Both go away when feature 13 backfills the real description** — see `build-plan.md`.

**The general rule this establishes: text the app displays but did not author, and cannot show in
full, says who cut it and where the rest is.** Silence reads as a bug.

### CompanyResearch — `components/job-details/CompanyResearch.tsx`

File: `components/job-details/CompanyResearch.tsx`
Last updated: 2026-08-02 (feature 12)

| Property         | Class                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Card             | `overflow-hidden rounded-xl border border-border bg-surface shadow-sm` — the **list variant** |
| Header row       | `flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between` |
| Divider          | `border-t border-border` on the body, edge to edge                   |
| Icon chip        | `grid size-9 place-items-center rounded-lg bg-accent-muted text-accent` |
| Empty state      | `flex flex-col items-center border-t border-border px-6 py-16 text-center` |

**Pattern notes:**

- **The list-variant card earns its second use here.** The design draws a rule spanning the card edge
  to edge under the header; padding therefore lives on the header row and on the body, not on the
  card. Same recipe as the jobs list card — reach for it whenever a card has a header rule.
- **The Research Company button is a pill:** `Button` overridden with `rounded-full`. It is the only
  pill button in the app; the design draws it that way and the Apply button on the same page as a
  normal `rounded-md`, so the two are meant to read as different kinds of action.
- **Empty state reuses `JobsTable`'s recipe** — `size-12` bordered circle, then a
  `text-sm font-medium text-text-primary` line and muted copy — but adds the bold line above the
  muted sentence, because this empty state has a CTA to point at and the table's does not.
- **The button is inert until feature 13.** Feature 12 is the full-UI feature and 13 is the agent,
  the same split feature 09 and feature 10 made on Find Jobs. `company_research` is deliberately not
  even selected by the read: a card that renders "No research yet" over a dossier that exists would
  be worse than one that cannot render a dossier at all.

### JobActions — `components/job-details/JobActions.tsx`

File: `components/job-details/JobActions.tsx`
Last updated: 2026-08-02 (feature 12)

The page's primary action: `buttonVariants({ size: "lg", className: "h-12 w-full rounded-lg" })` on
an `<a target="_blank" rel="noopener noreferrer">`. Same `h-12 w-full` step as `ProfileForm`'s Save.

**Pattern notes:**
`buttonVariants` on an `<a>` because it navigates, `Button` when it does not — the rule `PageControl`
made mechanical in `JobsPagination`. With no apply URL it renders the disabled `Button` plus the
muted reason (`mt-3 text-xs text-text-muted`), the project's standing disabled-with-a-reason
treatment. Every Adzuna row carries a redirect URL, so that branch should never be seen — it exists
because a button that opens nothing is worse than one that says why it cannot.

### Job details page — `app/find-jobs/[id]/page.tsx`

`AppNavbar active="find-jobs"` + `main.flex-1.bg-background` + `mx-auto w-full max-w-4xl px-6 py-8`,
then a back link and a `mt-6 space-y-6` stack of the five components above.

**`max-w-4xl`, not the 1440px page container** — the same call `/profile` made. This is a reading
column; `/find-jobs` uses the full width because a table is scanned across.

Back link: `inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-text-secondary
transition-colors hover:text-text-primary` + the standard `focus-visible` ring, with a `size-4`
`ChevronLeft`. It points at bare `/find-jobs` and drops the list's filter — the browser's back button
is what preserves it.

**Zero Client Components.** Everything on the page is either static or a `Link`; the one interactive
control, Research Company, is inert until feature 13 hands it a handler.

### Job details not-found — `app/find-jobs/[id]/not-found.tsx`

Rendered by `notFound()` — a non-uuid id, or a job that is not this user's.

**`AppNavbar` is the whole point of this file.** Without it Next serves its bare default 404, which
carries no navigation, and `architecture.md` makes "every protected page renders `AppNavbar`" an
invariant precisely because `/dashboard` once shipped without it and stranded signed-in users. **Any
route that calls `notFound()` needs one of these.**

`not-found.tsx` takes no props, so it resolves the session itself with `getSessionUser()` rather than
receiving a `userId`. `cache()` makes that free on a request that already resolved the user, and the
navbar is skipped entirely when there is no session.

Body is the centred-card empty state: `size-12` bordered circle with `SearchX`, a
`text-base font-semibold` heading, `text-sm leading-6 text-text-secondary` copy, then a
`Button variant="secondary" size="lg"` Back to Jobs link — the one empty state on this page that
*does* get a CTA, because unlike the jobs table there is nothing else on screen to act on.

### Job details loading — `app/find-jobs/[id]/loading.tsx`

Skeleton mirroring the real layout: back link, header card, the four-card fact grid, one text card.
Blocks are `animate-pulse rounded-md bg-border-light` at the same sizes the real elements occupy.

**It exists because the rows carry `prefetch={false}`** — without it a row click has no feedback at
all until the server answers. **It renders no `AppNavbar`**: `loading.tsx` fills the page slot, and a
skeleton navbar would flash a second header under the real one.

Trade it makes: a streamed response has already sent its headers, so `notFound()` downstream returns
200 with `robots: noindex` rather than a hard 404. Documented in Next's own `loading.js` reference,
and free here — the route is behind auth and nothing crawls it.

### Profile page — `app/profile/page.tsx`

`AppNavbar` + `main.flex-1.bg-background` + `mx-auto w-full max-w-4xl space-y-6 px-6 py-8`.
`max-w-4xl` rather than the 1440px page container: a form is a reading column, and the design draws
it at roughly 940px in a 1470px viewport.
