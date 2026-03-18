# UI/UX & Design Standardization Audit Prompt

## How to Use

Copy the prompt below and give it to an AI agent along with your codebase, screenshots, or Figma files. This audit is specifically built for apps with multiple surfaces (dashboards, marketing pages, etc.) to catch inconsistencies across the entire experience.

---

## The Prompt

```
You are a senior UI/UX designer and design systems architect performing a deep
design standardization and user experience audit on our application.

Our app has three main surfaces:
1. **Practitioner Dashboard** — where practitioners manage their work
2. **User Dashboard** — where end users interact with the platform
3. **Marketing Site** — public-facing pages (landing, pricing, about, blog, etc.)

Your goal is to evaluate whether this feels like ONE cohesive product or three
separate apps stitched together. Audit for visual consistency, interaction
patterns, navigation logic, and overall design maturity.

For each issue found, provide:
1. What the inconsistency or problem is
2. Where it occurs (which surface, which page/component)
3. A screenshot or reference if possible
4. The recommended fix with a clear "standardize to X" recommendation

Tag severity: 🔴 BROKEN (confusing or unusable), 🟡 INCONSISTENT (works but feels off),
🟢 POLISH (refinement opportunity).

---

### 1. DESIGN TOKENS & VISUAL FOUNDATION

Audit whether the visual building blocks are standardized across all three surfaces.

**Color**
- [ ] Is there a single, documented color palette used across practitioner dash, user dash, and marketing?
- [ ] Are primary, secondary, accent, success, warning, error, and neutral colors defined as tokens/variables?
- [ ] Are the same semantic colors used for the same purpose everywhere? (e.g., "danger red" is the same red on all surfaces)
- [ ] Are there any hardcoded hex/rgb values instead of token references? Flag every instance.
- [ ] Is the color palette being used correctly — or are there pages using off-palette colors?
- [ ] Are dark/light surface colors consistent? (same background grays, same card colors, same border colors)
- [ ] If there's a dark mode, is it implemented consistently across all surfaces or only some?

**Typography**
- [ ] Is the same font family used across all three surfaces? If different fonts are intentional (e.g., marketing uses a display font), is the pairing deliberate and documented?
- [ ] Is there a type scale defined (e.g., 12/14/16/18/20/24/32/40/48)?
- [ ] Are heading sizes (H1-H6) consistent across all surfaces?
- [ ] Is body text the same size everywhere? (Common issue: 14px in dashboards, 16px on marketing)
- [ ] Are font weights limited and consistent (e.g., 400 regular, 500 medium, 600 semibold, 700 bold)?
- [ ] Is line-height consistent for body text (1.5-1.6) and headings (1.1-1.3)?
- [ ] Are there any instances of font sizes or weights being set arbitrarily instead of from the scale?
- [ ] Is text truncation handled consistently (ellipsis, line clamp, or expand)?

**Spacing**
- [ ] Is there a spacing scale defined and used everywhere (e.g., 4/8/12/16/20/24/32/40/48/64)?
- [ ] Are component internal paddings consistent? (e.g., all cards use 24px padding, all modals use 32px)
- [ ] Are section gaps consistent? (space between page sections, between form groups, between cards in a grid)
- [ ] Is the spacing between a label and its input the same everywhere?
- [ ] Is the spacing between a heading and the content below it consistent?
- [ ] Are there random magic-number spacing values (e.g., margin-top: 13px) that should snap to the scale?

**Borders, Shadows & Radii**
- [ ] Is border-radius consistent? (e.g., buttons 8px, cards 12px, modals 16px — defined and reused)
- [ ] Are border colors the same across surfaces?
- [ ] Is box-shadow usage consistent? (same elevation levels: subtle, medium, heavy)
- [ ] Are dividers/separators styled the same way (color, thickness, spacing)?

### 2. COMPONENT CONSISTENCY

Audit whether the same UI elements look and behave identically across all surfaces.

**Buttons**
- [ ] Are button styles (primary, secondary, tertiary, ghost, destructive) visually identical across all three surfaces?
- [ ] Are button sizes standardized (sm, md, lg) with consistent padding and font sizes?
- [ ] Do all buttons have hover, active, focus, disabled, and loading states?
- [ ] Is button text casing consistent? (All "Save Changes" or all "SAVE CHANGES" — pick one)
- [ ] Are icon+text buttons spaced the same way everywhere?
- [ ] Is the primary action always the same visual weight? (e.g., always filled, never outlined for the main CTA)

**Form Elements**
- [ ] Do text inputs, selects, textareas, checkboxes, and radio buttons look the same across all surfaces?
- [ ] Is input height consistent? (Common issue: 36px on one page, 40px on another, 44px on a third)
- [ ] Are labels positioned the same way everywhere? (top-aligned, left-aligned, floating — pick one)
- [ ] Are placeholder text styles consistent (color, font size)?
- [ ] Are required field indicators the same everywhere (asterisk, "(required)" text, or color)?
- [ ] Are error messages styled and positioned the same way on every form?
- [ ] Do form validation patterns match across surfaces (validate on blur vs. on submit)?
- [ ] Are dropdown/select menus the same component or are there 3 different implementations?

**Cards & Containers**
- [ ] Do cards use the same border-radius, shadow, padding, and background across surfaces?
- [ ] Are card header patterns consistent (title position, action buttons, divider usage)?
- [ ] Are content containers / max-widths consistent across pages?
- [ ] Are empty card states designed the same way?

**Tables & Lists**
- [ ] Do data tables look the same in practitioner dash vs. user dash?
- [ ] Are table row heights, cell padding, header styles, and hover states consistent?
- [ ] Is pagination styled the same across all tables?
- [ ] Are list item patterns (avatar + text, icon + text) consistent?
- [ ] Are sorting and filtering interactions the same pattern everywhere?

**Modals, Drawers & Overlays**
- [ ] Are modals the same width, border-radius, padding, and overlay color across surfaces?
- [ ] Is the close pattern consistent? (X button position, click-outside behavior, Escape key)
- [ ] Are confirmation dialogs structured the same way (title, message, button order)?
- [ ] Are sheet/drawer panels consistent in width, animation, and behavior?
- [ ] Is the z-index layering correct (toasts above modals above drawers above overlays)?

**Notifications & Feedback**
- [ ] Are toast/snackbar notifications styled and positioned the same everywhere?
- [ ] Are success/error/warning/info alert banners styled consistently?
- [ ] Is the notification pattern the same? (toast vs. inline alert vs. banner — is there a rule for when to use each?)
- [ ] Are loading indicators consistent (spinner style, skeleton screen patterns, progress bars)?

**Icons**
- [ ] Is a single icon library used across the entire app? (e.g., Lucide, Heroicons, Phosphor)
- [ ] Are icons the same size within similar contexts? (16px inline, 20px in buttons, 24px standalone)
- [ ] Are icon colors consistent with text or semantic meaning?
- [ ] Are there any surfaces using a different icon set or mixing icon styles (outlined vs. filled)?

### 3. NAVIGATION & LAYOUT ARCHITECTURE

Audit the structural patterns that frame the user's experience.

**Global Navigation**
- [ ] Is the navigation pattern consistent between practitioner dash and user dash? (sidebar, top nav, or hybrid)
- [ ] If both dashboards use sidebars, are they the same width, style, and behavior?
- [ ] Is the marketing site navigation clearly different from the app nav (expected) but still on-brand?
- [ ] Does the transition from marketing → app feel smooth, or is it jarring?
- [ ] Is the logo/home link in the same position across all surfaces?

**Sidebar (if applicable)**
- [ ] Is the sidebar width consistent (e.g., 240px expanded, 64px collapsed)?
- [ ] Do sidebar items use the same icon size, text size, padding, and active/hover states?
- [ ] Is the sidebar grouping/section pattern consistent (dividers, group headers)?
- [ ] Is the active item indicator the same style (background highlight, left border, bold text)?
- [ ] Does the sidebar collapse behavior work consistently? (icon-only mode, tooltips, responsive breakpoint)
- [ ] Is the sidebar scroll behavior correct when content overflows?
- [ ] Are sidebar footer items (settings, profile, logout) positioned and styled consistently?

**Top Bar / Header**
- [ ] Is the header height the same across surfaces (e.g., 64px)?
- [ ] Is the header content layout consistent (logo left, nav center or left, user menu right)?
- [ ] Are breadcrumbs (if used) styled and placed consistently?
- [ ] Is the user avatar/profile menu in the same position and uses the same dropdown pattern?
- [ ] Are notification bells, search bars, or action buttons in the same position?

**Page Layout**
- [ ] Is the page content max-width consistent across similar page types?
- [ ] Is the page header pattern consistent (title, description, action buttons)?
- [ ] Are page-level tabs styled and positioned the same way across surfaces?
- [ ] Is the content area padding/margin consistent from the sidebar/header edge?
- [ ] Are two-column layouts (e.g., settings pages, detail views) structured the same way?

**Footer**
- [ ] Does the marketing site have a well-designed footer?
- [ ] Do dashboards need footers or are they correctly omitted?
- [ ] Is footer content and styling consistent across marketing pages?

### 4. USER FLOW & JOURNEY COHERENCE

Audit whether users can move through the app logically without getting lost or confused.

**Cross-Surface Transitions**
- [ ] Is the journey from marketing → signup → onboarding → dashboard smooth and logical?
- [ ] Does the user ever get "dumped" into a dashboard with no orientation or context?
- [ ] Are transitions between practitioner and user views clear (if a user has both roles)?
- [ ] Is role switching (if applicable) obvious and easy to find?
- [ ] When logging in, does the user land on the most useful page for their role?

**Information Architecture**
- [ ] Does the sidebar/nav menu order make sense? (Most used items first, logical grouping)
- [ ] Are menu labels clear and jargon-free? Would a new user understand every label?
- [ ] Is the menu hierarchy flat enough? (Deeply nested navigation is a smell)
- [ ] Are there pages accessible only through deep navigation that should be surfaced higher?
- [ ] Is the naming consistent? (Don't call it "Clients" in the sidebar but "Patients" on the page)
- [ ] Are there menu items that could be consolidated or removed?

**Common Task Flows**
- [ ] Map the top 5 most common tasks for each user type. How many clicks does each take?
- [ ] Are there tasks that require navigating to multiple pages that could be a single page or modal?
- [ ] Can users complete their primary task without scrolling past the fold?
- [ ] Are "create new" actions consistently accessible (same button position, same pattern)?
- [ ] Are "edit" and "delete" actions consistently placed on list/detail views?
- [ ] Is the "save" pattern consistent? (Auto-save vs. explicit save button — is it the same everywhere?)

**Wayfinding**
- [ ] Does the user always know where they are? (Active nav states, breadcrumbs, page titles)
- [ ] Does the user always know what they can do next? (Clear CTAs, not dead-end pages)
- [ ] Is the back/cancel behavior predictable? (Always goes to the parent page, not random)
- [ ] Are progress indicators used for multi-step flows?
- [ ] Is there a global search to help users find what they need quickly?

### 5. RESPONSIVE BEHAVIOR & LAYOUT BREAKPOINTS

Audit whether the entire experience adapts properly and consistently.

- [ ] Do all three surfaces share the same breakpoints (e.g., 640/768/1024/1280/1536)?
- [ ] Does the sidebar collapse at the same breakpoint on both dashboards?
- [ ] Is the mobile navigation pattern the same across surfaces (hamburger menu, bottom nav, sheet)?
- [ ] Are data tables responsive in the same way (horizontal scroll, card view, hidden columns)?
- [ ] Do modals and drawers adapt consistently on mobile?
- [ ] Are touch targets at least 44x44px on all surfaces?
- [ ] Is the mobile experience given equal attention, or are dashboards desktop-only afterthoughts?
- [ ] At every breakpoint, is there a layout that works — or are there "dead zones" (e.g., 800-1024px) where the layout breaks?

### 6. INTERACTION PATTERNS & MICRO-INTERACTIONS

Audit whether interactions feel polished, consistent, and intentional.

**Hover & Focus States**
- [ ] Do all clickable elements have a visible hover state?
- [ ] Is the hover style consistent? (Same opacity change, same background shift, same underline behavior)
- [ ] Are focus rings visible and consistent (for keyboard navigation / accessibility)?
- [ ] Do focus states follow a single style (blue ring, brand color ring, etc.)?

**Transitions & Animations**
- [ ] Are transition durations consistent? (e.g., 150ms for micro, 200ms for small, 300ms for large)
- [ ] Is the easing function consistent (ease-out for entrances, ease-in for exits)?
- [ ] Are page transitions smooth (no hard layout jumps, no flash of unstyled content)?
- [ ] Are sidebar expand/collapse, dropdown open/close, and modal enter/exit animated consistently?
- [ ] Are there any animations that feel sluggish, janky, or unnecessary?

**Click & Tap Feedback**
- [ ] Do buttons show immediate feedback on click (active state, ripple, scale)?
- [ ] Do form submissions show loading indicators?
- [ ] Are disabled elements consistently styled and do they prevent interaction?
- [ ] Are destructive actions (delete, remove, cancel) consistently colored and confirmed?

**Drag & Drop (if applicable)**
- [ ] Is drag behavior consistent across all drag-enabled surfaces?
- [ ] Are drag handles, preview states, and drop targets styled the same?

### 7. EMPTY, LOADING, & ERROR STATES

Audit whether the app handles non-ideal states with the same care as the happy path.

**Empty States**
- [ ] Does every list, table, feed, and dashboard widget have a designed empty state?
- [ ] Are empty states helpful? (Not just "No data" — include an illustration, message, and CTA)
- [ ] Are empty state illustrations/icons from the same style family?
- [ ] Is empty state copy consistent in tone and structure?

**Loading States**
- [ ] Are skeleton screens or loading indicators used on every data-dependent view?
- [ ] Is the skeleton screen pattern the same (pulse animation, shape mimicking real content)?
- [ ] Are full-page loaders styled the same (spinner style, placement, background)?
- [ ] Is there a consistent approach for inline loading (buttons, form submissions)?

**Error States**
- [ ] Are API error messages displayed consistently (toast, inline, full-page)?
- [ ] Is the error page (500, network error) designed and on-brand?
- [ ] Are form-level and field-level errors styled the same across all forms?
- [ ] Are retry patterns consistent (retry button, auto-retry, refresh prompt)?
- [ ] Do errors include helpful recovery actions, not just "Something went wrong"?

### 8. COPY, TONE & CONTENT PATTERNS

Audit whether the written content feels like it's from the same brand voice.

- [ ] Is the brand voice consistent across marketing (more expressive) and app (more functional)?
- [ ] Are button labels using the same pattern? (Verb + noun: "Create Appointment" vs. "Add" vs. "New" — pick a pattern)
- [ ] Are confirmation messages consistent? ("Saved successfully" vs "Changes saved" vs "Done!" — standardize)
- [ ] Are empty state messages in the same tone?
- [ ] Are error messages human and helpful, not technical jargon?
- [ ] Is capitalization consistent? (Title Case in nav, Sentence case in buttons, or one rule everywhere?)
- [ ] Are date and time formats consistent across all surfaces?
- [ ] Are number formats consistent (currency, percentages, counts)?
- [ ] Are placeholder texts helpful and consistent in style?
- [ ] Is there a clear hierarchy of when to use: heading, subheading, body, caption, helper text?

### 9. DASHBOARD-SPECIFIC PATTERNS

Audit patterns unique to the practitioner and user dashboards.

**Data Display**
- [ ] Are stat/metric cards styled the same in both dashboards (if both have them)?
- [ ] Are charts and graphs using the same charting library and color scheme?
- [ ] Is the data density appropriate? (Too sparse wastes space, too dense overwhelms)
- [ ] Are "view more" / "see all" patterns consistent?

**Settings & Preferences**
- [ ] Are settings pages structured the same in both dashboards (sidebar nav, grouped sections)?
- [ ] Is the save/cancel pattern the same on settings forms?
- [ ] Are toggles, checkboxes, and radio groups used consistently for the same types of choices?
- [ ] Is the profile/account section in the same location and structure?

**Notification & Activity**
- [ ] Are in-app notifications styled and accessed the same way in both dashboards?
- [ ] Are activity feeds / history logs presented in the same pattern?
- [ ] Are unread indicators (badges, dots) styled consistently?

### 10. MARKETING SITE SPECIFIC

Audit patterns unique to the public-facing marketing pages.

- [ ] Does the hero section have a clear value proposition and CTA?
- [ ] Is there visual consistency across all marketing pages (same section patterns, same spacing)?
- [ ] Are testimonials, features, and pricing sections using reusable component patterns?
- [ ] Do marketing CTAs lead to a clear conversion path (signup, demo, contact)?
- [ ] Is the marketing → app transition smooth (login/signup links visible, consistent branding)?
- [ ] Are blog/content pages properly templated with consistent typography and layout?
- [ ] Are marketing page animations tasteful and not distracting?
- [ ] Is above-the-fold content compelling enough to stop the scroll?

---

### OUTPUT FORMAT

Deliver your audit as a structured report with:

1. **Cohesion Score** — Rate the overall design cohesion from 0-100. Does this feel like one product?
2. **Surface Comparison Matrix** — A table showing which design patterns are consistent vs. divergent across Practitioner Dashboard, User Dashboard, and Marketing.
3. **Top 10 Inconsistencies** — The most visible/impactful places where the experience breaks.
4. **Design Token Recommendations** — A proposed standardized set of tokens (colors, spacing, typography, radii, shadows) that should be enforced globally.
5. **Component Standardization Plan** — Which components need to be unified, with "standardize to this version" recommendations.
6. **Navigation & Flow Fixes** — Specific changes to menu structure, sidebar, and user journeys.
7. **Quick Wins** — Fixes that take under 30 minutes but dramatically improve consistency.
8. **What's Working Well** — Patterns already done right that should be the standard.

Be forensic. Compare specific pages side by side. Reference exact components, CSS classes,
pixel values, and hex codes. Show where Dashboard A does it one way and Dashboard B does
it another. "The buttons are inconsistent" is useless — "Practitioner uses 8px radius
blue-600 buttons at 40px height while User dash uses 6px radius blue-500 buttons at
36px height" is what we need.
```

---

## Tips for Best Results

- **Provide screenshots of key pages from all 3 surfaces** so the agent can compare them visually.
- **Share your component library / design system** (Figma, Storybook) if you have one.
- **Share your CSS/Tailwind config** so the agent can check if tokens are actually defined.
- **Call out any intentional differences** between surfaces so the agent doesn't flag them.
- **Run this audit after the general production-readiness audit** — fix structural issues first, then polish consistency.
