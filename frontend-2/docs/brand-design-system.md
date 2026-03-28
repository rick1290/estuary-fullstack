# Estuary Brand Design System

> The definitive reference for visual design across the Estuary platform.
> Every component, page, and email should feel like it belongs to the same family.

---

## Brand Identity

**Tagline:** Your sanctuary for wellness, growth, and meaningful connections.

**Voice:** Warm, grounded, intentional. We speak like a trusted guide — never clinical, never salesy. Language mirrors the wellness space: "journeys" not "orders", "practice" not "business", "flow" not "metrics".

**Feel:** Premium but approachable. Think boutique spa lobby — not corporate SaaS dashboard. Every surface should feel calm, warm, and purposeful.

---

## Typography

### Font Pairing

| Role | Font | Weights | CSS Class |
|------|------|---------|-----------|
| **Display / Headings** | Cormorant Garamond | 300 (light), 400, 500 (medium), 600 | `font-serif` |
| **Body / UI** | DM Sans | 400, 500, 600, 700 | `font-sans` |

### Logo Wordmark

```
ESTUARY
```

- Font: Cormorant Garamond, weight 500
- Letter-spacing: `tracking-[0.25em]` (0.25em)
- Size: `text-2xl` (24px)
- Class: `font-serif text-2xl font-medium tracking-[0.25em]`
- Never bold. Never lowercase. Never an image.

### Heading Pattern (from homepage & become-practitioner)

All major headings follow this pattern:

```tsx
<h1 className="font-serif text-3xl sm:text-5xl md:text-[56px] font-normal leading-[1.15] tracking-tight text-olive-900">
  Main Statement
  <em className="italic text-terracotta-600">Accent Phrase</em>
</h1>
```

Rules:
- **font-serif** + **font-normal** (weight 400) for all display headings
- **Terracotta italic** for the emotional/accent phrase
- **leading-[1.15]** or **leading-[1.2]** for tight, premium line-height
- **tracking-tight** (-0.025em) for headings
- Responsive sizing: `text-3xl sm:text-4xl md:text-[42px]` for section headings

### Eyebrow Labels

```tsx
<span className="text-xs font-medium tracking-widest uppercase text-terracotta-600 bg-terracotta-100/60 px-4 py-1.5 rounded-full">
  Label Text
</span>
```

Or plain (no background):
```tsx
<span className="block text-xs font-medium tracking-widest uppercase text-sage-600 mb-4">
  Section Label
</span>
```

### Body Text

```tsx
<p className="text-base font-light leading-relaxed text-olive-600">
```

- Always `font-light` for body paragraphs
- Color: `text-olive-600` (primary body) or `text-olive-500` (secondary)
- Never use `text-gray-*` — always use `text-olive-*`
- Line-height: `leading-relaxed` (1.625)

### Blockquotes

```tsx
<blockquote className="font-serif text-xl sm:text-2xl italic text-olive-800 leading-snug pl-5 border-l-2 border-terracotta-500">
```

---

## Color Palette

### Primary Colors

| Name | Hex Range | Usage |
|------|-----------|-------|
| **Sage** | `sage-50` → `sage-900` | Primary brand, CTAs, accents, focus rings, borders |
| **Terracotta** | `terracotta-50` → `terracotta-900` | Warm accents, italic emphasis, secondary CTAs |
| **Olive** | `olive-50` → `olive-900` | Text, headings, dark buttons, foreground |
| **Cream** | `cream-50` → `cream-100` | Backgrounds, light surfaces |
| **Blush** | `blush-50` → `blush-900` | Soft accents, highlights |

### Semantic Usage

| Context | Color | Example |
|---------|-------|---------|
| Page background | `bg-cream-50` or `#f5f2ed` | Main body |
| Card background | `bg-white` | All cards |
| Card border | `border-sage-200/60` | Subtle, semi-transparent |
| Primary button | `bg-olive-800 text-cream-50` | Dark, authoritative |
| Primary button hover | `hover:bg-olive-700` | Slightly lighter |
| Secondary button | `bg-cream-50 text-olive-800` | Light, inverted |
| Gradient button | `bg-gradient-to-r from-sage-600 to-sage-700` | CTA buttons |
| Heading text | `text-olive-900` | All headings |
| Body text | `text-olive-600` | Paragraphs |
| Secondary text | `text-olive-500` | Supporting text |
| Muted text | `text-olive-500` | Meta info (minimum contrast) |
| Accent emphasis | `text-terracotta-600` | Italic accents in headings |
| Link underline | `decoration-sage-300` | Subtle underlines |
| Section divider | `bg-sage-200/60` | 1px horizontal rules |
| Focus ring | `ring-sage-400` | Keyboard focus indicators |
| Selection | `bg-sage-200 text-olive-900` | Text selection |
| Destructive | `text-red-500` or `destructive` token | Errors, delete actions |

### Colors to NEVER Use

- `text-gray-*` — always use `text-olive-*` equivalent
- `text-olive-400` on light backgrounds — fails WCAG AA contrast. Use `text-olive-500` minimum
- Generic blue/purple — off-brand
- Pure black (`#000`) — use `olive-900` instead

---

## Spacing & Layout

### Container System

```tsx
<div className="container max-w-7xl px-4 sm:px-6 lg:px-8">  // Standard
<div className="max-w-2xl mx-auto">                          // Narrow content (articles, forms)
<div className="max-w-5xl mx-auto">                          // Wide content (tables, grids)
```

### Section Spacing

```
Standard sections:     py-16 md:py-20
Hero sections:         py-20 md:py-28
Large sections:        py-20 lg:py-32  (use .section-spacing)
```

### Section Dividers

```tsx
<div className="h-px bg-sage-200/60 mx-4 sm:mx-6" />
```

Always between major homepage sections. Subtle, semi-transparent.

---

## Components

### Cards

```tsx
className="bg-white rounded-2xl border border-sage-200/60 p-5"
// or with hover:
className="bg-white rounded-2xl border border-sage-200/60 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
```

- Always `rounded-2xl` for content cards
- Border: `border-sage-200/60`
- Padding: `p-5` or `p-6`
- Hover: lift + shadow (`hover:-translate-y-0.5 hover:shadow-md`)

### Buttons

**Primary (dark):**
```tsx
className="bg-olive-800 hover:bg-olive-700 text-cream-50 rounded-full px-9 py-6 text-base font-medium shadow-lg"
```

**Primary (gradient):**
```tsx
className="bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-700 hover:to-sage-800 rounded-xl"
```

**Secondary (light):**
```tsx
className="bg-cream-50 text-olive-800 hover:bg-sage-100 rounded-full"
```

**Text link style:**
```tsx
className="text-sm text-olive-500 hover:text-terracotta-600 border-b border-olive-300 hover:border-terracotta-600 pb-0.5 transition-colors"
```

### Badges / Pills

```tsx
<Badge variant="outline" className="text-olive-700 bg-white hover:bg-sage-50 border-sage-200/60 px-4 py-2 text-sm font-light">
```

### Feature Cards (icon + title + description)

```tsx
<div className="bg-white rounded-2xl border border-sage-200/60 p-5 flex items-start gap-4">
  <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
    <Icon className="h-5 w-5 text-olive-600" />
  </div>
  <div>
    <h3 className="text-[15px] font-medium text-olive-900 mb-1">Title</h3>
    <p className="text-[13px] text-olive-500 font-light leading-relaxed">Description</p>
  </div>
</div>
```

---

## Motion & Animation

### Page Load / Scroll Reveal

Use Framer Motion with this standard stagger pattern:

```tsx
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemFade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}
```

Applied via:
```tsx
<motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
  <motion.div variants={itemFade}>...</motion.div>
</motion.div>
```

### Hover Transitions

- Duration: `duration-200` for hover, `duration-100` for press
- Easing: `ease-out`
- Card hover: `hover:-translate-y-0.5 hover:shadow-lg`
- Button press: `active:scale-[0.97]`
- Card press: `active:scale-[0.98]`
- All use `transition-all`

### Respecting User Preferences

Always honor `prefers-reduced-motion: reduce` (handled globally in globals.css).

---

## Dark Section Pattern

For contrast sections (pricing, CTAs):

```tsx
<div className="bg-olive-800 rounded-3xl p-8 sm:p-12">
  <h2 className="font-serif text-cream-50">...</h2>
  <p className="text-cream-50/70">...</p>
  <div className="bg-white/[0.08] border border-white/[0.12] rounded-xl p-4">
    // Glass-morphism content cards
  </div>
</div>
```

---

## Gradient Backgrounds

**CTA sections:**
```tsx
bg-gradient-to-br from-terracotta-100/60 via-sage-100/40 to-sage-200/60
```

**Subtle content backgrounds:**
```tsx
bg-gradient-to-b from-cream-50 to-cream-100      // Footer
bg-gradient-to-b from-sage-50/30 to-cream-50      // Light sections
```

**Avatar/placeholder fallbacks:**
```tsx
bg-gradient-to-br from-sage-200 to-terracotta-200
```

---

## Form Controls

### Standardized Heights

All form controls in the same row must share the same height:
- Default: `h-11` (44px) — meets touch target minimums
- Buttons alongside inputs: match `h-11`

### Input Pattern

```tsx
className="border border-sage-200 bg-background rounded-lg px-4 py-3 h-11
  focus:border-sage-400 focus:ring-2 focus:ring-sage-400
  hover:border-sage-300
  placeholder:text-olive-400/70"
```

### Focus Rings

All interactive elements: `focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2`

---

## Email Consistency

The MJML email templates use the same brand system:
- Logo: Cormorant Garamond, weight 500, letter-spacing 6px
- Body: DM Sans
- Primary color: `#2d3b2d` (≈ olive-900)
- Sage accent: `#8fa88f` (≈ sage-400)
- Background: `#f5f0eb` (≈ cream-50)
- Button: `#2d3b2d` with white text, 50px border-radius

---

## Accessibility Minimums

- Text contrast: WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Minimum text color on light backgrounds: `text-olive-500`
- Touch targets: 44px minimum (`min-h-[44px]`)
- Focus indicators: visible ring on keyboard navigation
- Alt text: required on all images
- Reduced motion: respected globally
