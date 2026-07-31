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

### Navbar — `components/layout/Navbar.tsx`

`h-16` white bar, `border-b border-border`, logo left, nav centre, primary CTA right.
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
