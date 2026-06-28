# CraftscapeHK Design Guardrails

This file defines the product design direction for CraftscapeHK. Use it before changing UI, copy, motion, visual hierarchy, onboarding, commerce, artisan tools, or AI creation flows.

The goal is to keep the app culturally specific, calm, and production-grade. Do not let new work drift into generic AI/SaaS styling.

## Product Design Position

CraftscapeHK is a mobile-first cultural gallery and craft commerce platform. It should feel like entering a small Hong Kong craft museum that also lets visitors commission, book, and buy.

The product is not:

- a generic startup marketplace
- a neon cyberpunk toy app
- an AI image-generation playground
- a SaaS admin dashboard with craft images pasted in
- a tourist brochure

The interface should respect artisans and heritage first. AI is presented as a bridge to craft participation, not as the hero replacing craft knowledge.

## Current Visual Language

The existing app is built around:

- A single-column mobile shell with `max-w-lg`, like a curated app or museum audio guide.
- Deep Hong Kong harbour blue as the dominant identity color.
- Porcelain/off-white surfaces for reading, cards, and canvas work.
- Red accents for important craft actions and emotional emphasis.
- Full-bleed craft imagery with dark overlays and gradient fades.
- Tactile cards, rounded panels, and soft bluish shadows.
- Bilingual English and Traditional Chinese copy.
- Bottom navigation with a prominent center Explore action.
- Spring-based page transitions and swipe gestures.
- Museum/editorial section labels, not loud marketing blocks.

Preserve these traits unless there is an explicit redesign decision.

## Design Principles

### 1. Culture First

Every screen should foreground craft, artisan, material, process, place, or story. AI, booking, and payment flows should support that context.

Good:

- “Book a letterpress session with Master Lee”
- “Approve this dragon motif before production”
- “This deposit reserves your workshop seat”

Avoid:

- “Unlock your creativity”
- “Supercharge your workflow”
- “AI-powered experience”

### 2. Museum Calm, Commerce Clarity

Discovery screens can be atmospheric. Transaction screens must be clear.

- Craft discovery can use full-bleed images, overlays, and staged motion.
- Booking, payment, approval, and order status screens should use calm surfaces, direct labels, and plain next steps.
- Do not hide price, date, quantity, payment state, or approval state behind decorative layouts.

### 3. Mobile App, Not Web Page

The app behaves like a focused mobile product.

- Primary layout stays within the centered mobile shell.
- Bottom navigation and full-screen sheets are core patterns.
- Prefer one primary action per screen.
- Avoid desktop-first sidebars unless the feature is genuinely complex, such as Text Lab.

### 4. Craft Texture Over Tech Gloss

Use craft images, scanned textures, glyphs, paper, porcelain, ink, cloth, tile, or subtle linework as atmosphere. Avoid synthetic tech decoration.

Use:

- image-derived blur backdrops
- paper-like off-white fields
- red seal-like accents
- simple line icons
- material thumbnails

Avoid:

- purple-blue AI gradients
- glassmorphism as a default
- glowing blobs
- floating 3D objects
- fake metrics cards on visitor pages
- “magic sparkle” decoration unless tied to a specific craft moment

## Color System

Use the existing CSS variables in `index.css`. Do not introduce one-off colors unless the token set is intentionally expanded.

Core tokens:

- `--color-bg`: app background
- `--color-page-bg`: page background
- `--color-surface`: cards, panels, modals
- `--color-primary-accent`: harbour blue, primary identity and action color
- `--color-button-cta`: red craft/commission action
- `--color-text-primary`: main text
- `--color-text-secondary`: supporting text
- `--color-border`: visible structural borders
- `--color-nav-bg`: translucent bottom navigation

Color rules:

- Blue is the platform identity.
- White/off-white is the reading surface.
- Red is for craft emphasis, approval, commission, booking, or payment-critical action.
- Grey is supporting structure, never the dominant mood.
- Keep dark mode aligned with the same blue/surface hierarchy.
- Do not add rainbow category colors unless there is a meaningful craft taxonomy behind them.

## Typography

Current typography uses system UI with careful weight, tracking, and line height. Until custom fonts are chosen, keep type restrained and readable.

Rules:

- Use strong hierarchy instead of many font sizes.
- Use large type over imagery for craft names.
- Use small uppercase labels sparingly for museum/editorial metadata.
- Keep body copy comfortable for bilingual reading.
- Traditional Chinese must not feel secondary or squeezed.
- Do not use generic marketing display typography that clashes with the mobile museum tone.

Suggested hierarchy:

- Screen title: `text-2xl` to `text-4xl`, bold, tight line height.
- Section title: `text-xl`, semibold or bold.
- Body: `text-base` or `text-[17px]`, relaxed line height.
- Metadata: `text-xs` to `text-sm`, increased tracking only when it reads as a label.

## Layout Patterns

### App Shell

Keep the centered mobile shell:

- `max-w-lg`
- full-height mobile viewport handling
- bottom navigation on primary visitor flows
- full-screen sheet transitions for details, AI Studio, chat, and Text Lab

### Discovery

Use visual hierarchy based on craft imagery.

- Full-bleed craft card or hero image.
- Dark overlay for text legibility.
- Gradient fade into page background.
- Artisan name as metadata, craft name as the main anchor.
- One obvious detail or create action.

### Lists

Use lists when users are comparing real choices.

- Marketplace: vertical product rows with image, name, artisan, price.
- Events/workshops: editorial sections, filters, featured carousel, then scannable cards.
- Orders/messages: compact rows with status and time.

Avoid generic equal-card grids unless the user is truly browsing a collection. If a grid is used, establish a reason: featured items, bento profile gallery, or availability comparison.

### Artisan Tools

Artisan mode can be denser, but must still feel part of CraftscapeHK.

- Use the same tokens, borders, shadows, and typography.
- Dashboard cards should be practical and scoped to artisan tasks.
- Avoid corporate analytics tropes unless they help the artisan act.
- Prioritize schedule, order, request, and message states over vanity metrics.

## Motion Rules

Motion should feel like a mobile guide, not a demo reel.

Use:

- sheet entrance from bottom for detail views
- short fade for tab changes
- spring transitions for cards and navigation
- swipe gestures for craft discovery
- subtle staged reveal for hero/detail content

Avoid:

- random hover animation on every element
- bouncing or elastic novelty motion
- long decorative loading sequences
- animations that delay booking, payment, messaging, or approval

Default timing:

- Sheet transition: spring, `stiffness: 300`, `damping: 30`.
- Tab fade: around `0.2s`.
- Tap scale: `0.95` to `0.98`.
- Content reveal: staggered but short, usually under `0.6s`.

## Component Guardrails

### Buttons

- Primary actions use blue or red tokens.
- Use rounded full buttons for major mobile CTAs.
- Keep one primary CTA per decision area.
- Disabled states must be clear and still readable.

### Cards

- Use `museum-card` or the same visual treatment unless a feature needs a new pattern.
- Cards should have a clear subject: craft, workshop, product, order, message, request.
- Avoid nested cards unless the hierarchy cannot be expressed another way.

### Modals And Sheets

- Prefer bottom/full-screen sheets for major flows.
- Use centered modals for confirmations, upload choices, and short forms.
- Always include a visible close/back path.

### Statuses

Production flows need explicit status language.

Use concrete labels:

- `Pending artisan approval`
- `Approved, ready for payment`
- `Payment received`
- `Workshop seat confirmed`
- `Change requested`
- `Cancelled`

Avoid vague labels:

- `Processing`
- `In progress`
- `Almost there`
- `Completed` without saying what completed

## AI Feature Guardrails

AI should be framed as co-creation with craft constraints.

Rules:

- Explain what the artisan will review or make.
- Show generated images as concept references, not final goods.
- Keep prompt UI simple and contextual to the craft.
- Include cultural/material constraints in helper copy.
- Never imply AI output replaces artisan approval, pricing, or production.
- For co-creation requests, always show approval state before payment.

Avoid:

- “Generate anything”
- fake AI examples that ignore craft constraints
- generic prompt chips unrelated to Hong Kong craft
- making generated images look like guaranteed final deliverables

## Commerce And Booking Guardrails

Payment and booking screens must be boring in the best way.

Rules:

- Price, deposit, quantity, schedule, artisan, and cancellation state must be visible before payment.
- Stripe checkout entry points must make clear what the user is paying for.
- Workshop bookings use `events`, but the UI should call them workshops when the event type is a workshop.
- Co-creation requests require artisan approval before checkout.
- Confirmation screens should show what happens next and how to contact the artisan.

Do not decorate payment states with celebratory effects until the transactional information is clear.

## Bilingual And Local Culture Rules

- English and Traditional Chinese are equal product languages.
- Do not write English first and treat Chinese as an afterthought.
- Avoid Mainland/Simplified Chinese phrasing unless deliberately quoting a source.
- Prefer Hong Kong terms and tone where appropriate.
- Keep artisan names, craft names, and places precise.
- Check line breaks for long Chinese strings and mixed English/Chinese names.

## Accessibility Rules

- All image-heavy cards need meaningful `alt` text.
- Interactive icons need `aria-label`.
- Text over images must have strong overlays.
- Touch targets should be at least 44px.
- Keyboard focus must be visible.
- Motion must not be required to understand state.
- Color cannot be the only status indicator.

## Anti-Slop Checklist

Before merging any UI change, ask:

- Does this screen still feel like CraftscapeHK?
- Is craft or artisan context visible?
- Is the primary action obvious?
- Are colors from `index.css` tokens?
- Does the motion help navigation or hierarchy?
- Is the copy specific to Hong Kong craft, booking, payment, or artisan approval?
- Would this screen look wrong if dropped into a generic SaaS template?

If the answer to the last question is “no,” the design is too generic.

## Explicit Don’ts

Do not add:

- generic SaaS hero layouts
- purple/blue AI gradients as the main identity
- random glass panels
- meaningless metric cards
- vague AI copy
- fake testimonials
- bland stock illustrations
- cards with identical weight and no hierarchy
- non-token colors
- hover-only affordances on mobile-critical actions
- English-only UX changes
- payment or approval flows without clear status language

## When Extending The System

If a new feature needs new visual treatment:

1. State the user task and emotional tone.
2. Start from existing tokens and patterns.
3. Add the smallest new pattern that solves the problem.
4. Check visitor mode, artisan mode, English, Traditional Chinese, light mode, and dark mode.
5. Update this file if the new pattern becomes part of the system.

