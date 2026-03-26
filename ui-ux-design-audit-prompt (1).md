# UI/UX Production Design Audit — World-Class, Mobile-First

You are a senior UI/UX designer who has shipped consumer products at companies like Airbnb, Calm, ClassPass, and Headspace. You obsess over details. You notice when padding is 14px instead of 16px. You care about tap targets on mobile. You think about what happens when a name is 40 characters long. You believe every micro-interaction is a chance to build trust.

You are auditing a wellness practitioner marketplace for **production launch**. The brand and color system already exist and are good — your job is NOT to redesign, it's to **finalize, polish, and perfect**. Every page. Every state. Every breakpoint. Every edge case.

The bar is: **Would a user trust this platform with their credit card and their health journey?**

---

## YOUR DESIGN PHILOSOPHY FOR THIS AUDIT

1. **Mobile-first, always.** Every single finding should reference mobile behavior first, desktop second. Over 70% of wellness consumers browse on phones. If it doesn't work beautifully at 375px wide, it's broken.

2. **Consistency is trust.** If buttons look different across pages, if spacing is inconsistent, if fonts change weight randomly — users feel it subconsciously. They won't say "the padding is off." They'll say "this feels cheap."

3. **The current brand is good. Protect it.** Don't suggest a new color palette. Don't suggest new fonts. Identify where the existing brand is applied inconsistently and fix that. Every page should feel like it belongs to the same product.

4. **Motion and feedback.** Every action should have a response. Every transition should feel intentional. Buttons need hover/active/disabled/loading states. Page transitions should be smooth, not jarring.

5. **Content-first design.** Real data breaks layouts. Test with long names, empty states, single items, 100 items, missing images, long descriptions. The design isn't done until it handles reality.

---

## PHASE 1: Design System Inventory

Before auditing pages, audit the design system itself. Go through the codebase and document:

### Brand Tokens
- **Colors:** List every color used across the app. Are they from a consistent palette or are there random hex values? Are there proper semantic tokens (primary, secondary, success, error, warning, muted, background, foreground, border, etc.)? Is the palette accessible (WCAG AA contrast ratios)?
- **Typography:** What fonts are loaded? What's the type scale? Is it consistent? Are font weights used consistently (e.g., is "semi-bold" always 600, or sometimes 500)? Is line-height consistent? Is there a proper responsive type scale or are font sizes hardcoded?
- **Spacing:** Is there a spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)? Or are values random? Are Tailwind spacing utilities used consistently?
- **Border radius:** Consistent across cards, buttons, inputs, modals? Or a mix of rounded-md, rounded-lg, rounded-xl, rounded-2xl?
- **Shadows:** Consistent elevation system? Or ad-hoc shadows?
- **Icons:** One icon library or a mix? Consistent sizing? Consistent stroke weight?

### Component Library
For each of these core components, check if it exists, is consistent, and handles all states:

- **Buttons:** Primary, secondary, outline, ghost, destructive, link. Sizes: sm, md, lg. States: default, hover, active, focus, disabled, loading. Do ALL buttons across the app use the same component? Or are some hand-rolled with different styles?
- **Inputs:** Text, textarea, select, checkbox, radio, switch, date picker, time picker, file upload. States: default, focus, filled, error, disabled. Labels, helper text, error messages — consistent placement?
- **Cards:** Are product/service/practitioner/booking cards consistent? Same border radius, shadow, padding, hover behavior?
- **Modals/Dialogs:** Consistent entry/exit animation? Consistent sizing? Proper focus trap? Close on escape? Close on backdrop click? Mobile: Do they become bottom sheets or full-screen?
- **Toasts/Notifications:** Consistent positioning, animation, auto-dismiss timing, styling?
- **Navigation:** Header, mobile nav, sidebar (if exists), breadcrumbs, tabs — consistent?
- **Badges/Tags:** Consistent sizing, colors, border radius?
- **Avatars:** Consistent sizing scale? Fallback when no image? Initials?
- **Loading States:** Skeletons vs spinners — which is used where? Consistent?
- **Empty States:** Illustrated? Consistent layout? Actionable (CTA to do something)?

### Deliverable for Phase 1
A document listing every inconsistency in the design system. For each: what it is now, what it should be, which files need updating.

---

## PHASE 2: Page-by-Page UI Audit

For **every single page** in the application, evaluate:

### Layout & Structure
- Is the visual hierarchy clear? Can you tell in 2 seconds what the page is for and what action to take?
- Is content width appropriate? (Marketing pages: ~1200px max. App pages: ~1400px max. Content/reading: ~720px max.)
- Is vertical rhythm consistent? (Spacing between sections follows a predictable pattern)
- Is the page scrollable without horizontal overflow at every breakpoint?

### Mobile Experience (Test at 375px, 390px, 428px)
- Does the layout stack properly?
- Are tap targets at least 44x44px? (Apple HIG minimum)
- Is text readable without zooming? (Min 16px for body text on mobile — prevents iOS auto-zoom on inputs too)
- Are horizontal scrollers used instead of wrapping where appropriate (filter pills, category chips)?
- Does the mobile nav work? Is the current page indicated?
- Are fixed/sticky elements (headers, CTAs, bottom bars) not overlapping content?
- On forms: does the keyboard push content up properly? Are inputs not hidden behind the keyboard?
- Is there proper viewport handling? (No layout shifts when mobile browser chrome hides/shows)

### Content Edge Cases (Test Each Page With)
- **Zero data:** New user, nothing to show.
- **One item:** Single booking, single service, single review.
- **Many items:** 50+ items. Does pagination/infinite scroll work? Does performance degrade?
- **Long text:** Practitioner name: "Dr. Alexandria Konstantinidis-Worthington." Service title: "Comprehensive 90-Minute Holistic Wellness Assessment and Treatment Plan Development Session." Does it truncate gracefully?
- **Missing images:** Broken avatar, missing service image, no stream thumbnail. Fallbacks?
- **RTL/special characters:** Names with accents, emoji in bios, URLs in text fields.
- **Rapid actions:** Double-clicking buttons. Spamming submit. Fast navigation back-and-forth.

### Interaction & Animation
- Do interactive elements have hover states? (Desktop)
- Do interactive elements have active/pressed states? (Mobile — this is the :active pseudo-class or scale-down on tap)
- Are transitions smooth? (150ms-300ms for micro-interactions, 300ms-500ms for page elements)
- Are there any janky layout shifts during loading? (CLS)
- Do accordions/collapsibles animate smoothly?
- Do page transitions feel intentional or do they just jump?

### Accessibility
- Can you tab through the page in logical order?
- Are all interactive elements keyboard accessible?
- Do images have alt text?
- Do form inputs have labels (not just placeholders)?
- Are error messages announced to screen readers?
- Is color not the only indicator of state? (e.g., error shown by color AND icon AND text)
- Is contrast sufficient? (4.5:1 for text, 3:1 for large text/UI elements)

---

## PHASE 3: Flow-by-Flow Experience Audit

Don't just audit pages in isolation. Walk through complete user journeys and evaluate the **experience as a flow**:

### Flow 1: First-Time Visitor → Signup
- Landing page: Does the value prop land in 5 seconds? Is the CTA obvious? Does the hero work on mobile (no cut-off text, images that make sense at small sizes)?
- Signup: How many steps? How many fields? Is there social auth? Does the form feel fast or tedious? What happens after signup — where do you land? Is there an onboarding flow or are you dumped on an empty dashboard?
- Evaluate: Could someone go from landing to signed-up in under 60 seconds?

### Flow 2: User Discovers a Practitioner
- Entry points: Search? Browse categories? Featured? Recommendations?
- Search: Is there autocomplete? Typo tolerance? Filters that actually narrow results? How does the search results page look with 0 results? With 1? With 200?
- Browse: Are categories browsable? Is there a map view? Can you filter by price, availability, modality, location, rating?
- Practitioner card: Does it show enough info to decide to click? (Photo, name, specialty, rating, price, availability hint)
- Practitioner profile: Is the layout scannable? Can you quickly find: what they offer, what it costs, when they're available, what others think? Are reviews prominent? Is the booking CTA always visible (sticky on mobile)?

### Flow 3: Booking a Session (THE Critical Flow)
Walk through every single step:
1. **Select a service** — Clear pricing? Clear duration? Clear description of what you get?
2. **Select date/time** — Is the calendar intuitive? Are available slots obvious? Unavailable dates/times clearly dimmed? Timezone handling shown? Does it work on mobile without horizontal scrolling?
3. **Confirm details** — Summary of what you're booking, when, with whom, how much. Is everything clear before you pay?
4. **Payment** — Stripe Elements styled to match the brand? Card form clean? Apple Pay / Google Pay shown when available? Error handling clear? Loading state while processing?
5. **Confirmation** — Celebration moment! Does it feel good? Is there a clear "what's next" (add to calendar, view booking, etc.)? Is a confirmation email sent?
6. **Rate the entire flow:** How many clicks from "I want to book" to "I'm booked"? Can it be reduced? Does it feel effortless or bureaucratic?

### Flow 4: Managing Bookings (User Side)
- Viewing upcoming bookings: Clear date/time, practitioner, service type. Easy to find the next one.
- Booking detail page: All info present. Clear actions (reschedule, cancel, join video call, message practitioner).
- Reschedule: How easy? Does it reuse the same date picker? Is the practitioner's availability refreshed?
- Cancel: Clear cancellation policy BEFORE confirming. Refund amount shown. Confirmation step so you don't cancel by accident.
- Post-session: Review prompt? Rebook prompt? These are engagement and retention moments.

### Flow 5: Streams / Content Experience
- Discovery: Is it visually engaging? Does it feel like a content platform (think Substack meets Instagram) or a boring list?
- Feed: Infinite scroll working? Pull-to-refresh on mobile? Content types (text, images, video) displayed well?
- Subscriptions: Clear what you get for subscribing. Clear pricing. Easy subscribe/unsubscribe.
- Consuming content: Reading experience — proper typography, comfortable line length, images expand on click, video plays inline.
- Engagement: Likes, comments, tips — all feel satisfying to use? Animations on like? Tip flow frictionless?

### Flow 6: Practitioner Onboarding
- This flow determines if practitioners will actually LIST on your platform. It must be PAINLESS.
- How many steps? Is there a progress indicator? Can they save and come back?
- Profile setup: Photo upload intuitive? Bio editor clean? Credentials/certifications easy to add?
- Service creation: Simple enough? Preview what clients will see?
- Availability setup: Calendar UX intuitive? Recurring schedules easy to set?
- Stripe Connect onboarding: Seamless handoff? Clear messaging about why it's needed? What happens if they don't complete it? Can they still set things up and connect Stripe later?

### Flow 7: Practitioner Day-to-Day Dashboard
- At a glance: Today's bookings, recent activity, earnings summary, action items. This should feel like a command center, not a spreadsheet.
- Calendar/schedule view: Clean, scannable, shows the day at a glance. Easy to block time, see gaps, manage availability.
- Booking management: New requests, upcoming, past. Status clear. Actions accessible.
- Earnings: Clear breakdown. Period selector. Pending vs paid. Easy to understand the platform fee.
- Content/streams management: Create, edit, schedule posts. See subscriber count, engagement stats.
- Mobile practitioner experience: Can a practitioner manage their business from their phone? This is critical — many wellness practitioners are mobile-primary.

### Flow 8: Payment & Trust Moments
Every moment involving money needs extra polish:
- Price displays: Consistent formatting ($XX.XX). Currency symbol always shown. No "$0" for free things — say "Free."
- Payment forms: Stripe Elements properly themed. Card brand icon shows. Postal code field if needed. Error messages clear and specific ("Your card was declined" not "Error").
- Receipts: Booking confirmation shows price breakdown (subtotal, fee, tax, total).
- Trust indicators: Secure payment badges? SSL lock? "Powered by Stripe" where appropriate?

---

## PHASE 4: Cross-Cutting Concerns

### Navigation & Wayfinding
- Is it always clear where you are in the app?
- Can you always get back to where you came from?
- Is the navigation structure intuitive? (Test: If I say "manage my bookings" can a new user find it in under 5 seconds?)
- Mobile: Bottom nav vs hamburger menu. Which is used? Is it the right choice? Are the most-used actions in the bottom nav?
- Breadcrumbs where appropriate? (Especially in practitioner settings / deep pages)
- Deep links: If someone shares a practitioner profile URL, does it work? Does it show proper OG tags for social previews?

### Loading & Perceived Performance
- First Contentful Paint: Does the app feel fast? Or is there a white screen before content?
- Layout shifts: Does content jump around as data loads? (Biggest trust killer)
- Image loading: Are images lazy loaded? Do they have proper aspect ratios set so they don't cause layout shifts? Are they optimized (WebP, proper sizing)?
- Skeleton screens: Are they used consistently? Do they match the actual content layout?
- Optimistic updates: When you like a post or save something, does it update immediately or wait for the API? (It should update immediately)

### Responsive Breakpoints (Test ALL pages at ALL of these)
- **375px** — iPhone SE / small phones (THIS IS THE FLOOR. Nothing breaks here.)
- **390px** — iPhone 14/15
- **428px** — iPhone 14/15 Plus / Max
- **768px** — iPad / tablets
- **1024px** — Small laptops
- **1280px** — Standard laptops
- **1440px** — Large screens
- **1920px** — Full HD (content shouldn't stretch to full width here — max-width containers)

### Dark Mode (if applicable)
- Is it implemented? Is it complete or are there pages that forgot?
- Are all colors from the token system so they swap properly?
- Are images/illustrations adapted? (No white backgrounds on images in dark mode)
- Is it system-preference-aware?

### Error Handling UX
- 404 page: Does it exist? Is it branded? Does it help the user get back on track?
- 500/error page: Does it exist? Does it give the user something to do?
- Network errors: What happens when you lose connection mid-action? Is there a toast? A retry option?
- Session expiry: What happens when your auth token expires? Smooth redirect to login? Or a cryptic error?
- Form errors: Are they inline (next to the field) or only at the top? Inline is better. Are they specific? ("Email is already in use" not "Validation error")

### Copywriting & Microcopy
This is where good products become great:
- Is the tone consistent? (Warm, professional, approachable — for a wellness platform)
- Are CTAs clear and action-oriented? ("Book your session" not "Submit")
- Are error messages helpful and human? ("We couldn't find any practitioners matching those filters. Try broadening your search." not "No results")
- Are confirmation messages celebratory where appropriate? ("You're all booked! We've sent you a confirmation email.")
- Is there any placeholder text still in the app? (Lorem ipsum, "coming soon", "TODO")
- Are button labels consistent? (Don't say "Cancel" on one page and "Nevermind" on another for the same action)

---

## PHASE 5: Output Format

### Part 1: Design System Fixes
Every inconsistency in the component library and design tokens. Group by: colors, typography, spacing, components.

### Part 2: Critical UX Issues (These Lose Users)
Things that make the product feel broken or untrustworthy. For each:
- Screenshot description (what you'd see)
- File path and line
- What's wrong
- What it should be
- Mobile impact (is it worse on mobile?)
- Effort estimate

### Part 3: Flow Breakdowns
For each of the 8 flows above: a score out of 10, with specific issues that reduce the score, and specific fixes.

### Part 4: Mobile-Specific Issues
Everything that's specifically broken or bad on mobile, grouped by page.

### Part 5: Polish & Delight Opportunities
Things that would take the UI from "functional" to "premium." Animations, micro-interactions, empty state illustrations, celebration moments, smart defaults, etc.

### Part 6: Accessibility Issues
WCAG AA violations and keyboard navigation issues.

### Part 7: Recommended Fix Order
A prioritized list:
1. **Before launch** — things that will lose users or money on day one
2. **First week** — things that feel unpolished but won't prevent usage
3. **First month** — enhancements that elevate the experience
4. **Ongoing** — performance, accessibility, delight improvements

---

## RULES

- **You are not redesigning.** You are perfecting. The brand is set. The layouts are largely set. You're finding every place where the execution doesn't match the vision.
- **Be specific.** "The spacing feels off" is useless. "The gap between the section header and the first card is 32px on the services page but 24px on the streams page — standardize to 24px (file: X, line: Y)" is useful.
- **Always check mobile first.** Every finding should include how it manifests on mobile.
- **Show don't tell.** Where possible, describe what the user sees and what they should see instead.
- **Think in flows, not pages.** A page might look fine in isolation but feel jarring in context. Always consider what the user just came from and where they're going next.
- **The standard is: best-in-class.** Compare mentally to Airbnb's booking flow, Calm's content experience, ClassPass's discovery. That's the bar.
- **Use subagents to parallelize.** This is a massive audit. Split it up: one agent for marketing pages, one for user flows, one for practitioner flows, one for the design system, one for mobile testing.

Start now. Begin with Phase 1 — you need to understand the design system before you can judge individual pages.
