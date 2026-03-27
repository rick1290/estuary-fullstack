# Prompt: Rebrand All MJML Email Templates to Estuary Design System

---

Copy everything below this line and paste it into a new Claude conversation along with your MJML template files.

---

## Context

I'm building **Estuary** — a two-sided wellness marketplace that connects practitioners (yoga teachers, Reiki healers, coaches, therapists, etc.) with users seeking sessions, workshops, courses, and wellness experiences. Practitioners list their services, and users browse, book, and review them.

**Live site:** https://estuary-frontend.onrender.com/

Key pages for reference:
- Marketplace: https://estuary-frontend.onrender.com/marketplace
- Practitioners: https://estuary-frontend.onrender.com/marketplace/practitioners
- Sessions & Bundles: https://estuary-frontend.onrender.com/marketplace/sessions
- Workshops: https://estuary-frontend.onrender.com/marketplace/workshops
- Courses: https://estuary-frontend.onrender.com/marketplace/courses
- Streams (content feed): https://estuary-frontend.onrender.com/streams
- Become a Practitioner: https://estuary-frontend.onrender.com/become-practitioner

**Brand tagline:** "Your sanctuary for wellness, growth, and meaningful connections."

---

## Brand Design System

Follow these guidelines exactly when updating the MJML templates:

### Typography
- **Display / Headings:** `Cormorant Garamond` (weights: 300 light, 400 regular, 500 medium) — use for all h1, h2, h3, hero text, and section titles. Use `<em>` italic on one keyword per heading for emphasis (e.g., "Your Wellness *Journey*").
- **Body / UI:** `DM Sans` (weights: 300 light, 400 regular, 500 medium) — use for all body text, labels, buttons, nav, and footer.
- **Fallbacks:** Georgia, serif for display; Helvetica, Arial, sans-serif for body.
- **Label style:** 10–12px, weight 500, letter-spacing 2–3px, uppercase, color #8fa88f — used for category tags, section eyebrows, and metadata labels.

### Color Palette

**User-facing emails** (welcome, booking confirmation, reminders, reviews):
- Hero gradient: `linear-gradient(160deg, #2d3b2d 0%, #3d5a3d 40%, #4a6e4a 70%, #5a7f5a 100%)` (deep forest green)
- Primary text: `#2d3b2d`
- Accent / sage: `#8fa88f`
- Light sage (buttons, highlights): `#c8d7b4`
- Body text: `#5a5a5a`
- Secondary text: `#7a7a7a`
- Muted text: `#999999`

**Practitioner-facing emails** (welcome, new booking, payout, etc.):
- Hero gradient: `linear-gradient(160deg, #1a2a3a 0%, #2a4a5a 40%, #3a6070 70%, #4a7585 100%)` (deep blue-teal)
- Accent: `#b4d0d7`
- Use the same body/text colors as user-facing.

**Reminder / warm emails** (session reminders, nudges):
- Hero gradient: `linear-gradient(160deg, #3a2e2e 0%, #5c4a3e 45%, #7a6b5a 100%)` (warm earth)
- Accent: `#d4c4a8`

**Review / feedback emails:**
- Hero gradient: `linear-gradient(160deg, #2d2d3b 0%, #4a4a6e 50%, #5a5a7f 100%)` (soft purple)
- Accent: `#c8c4d7`

**Shared across all emails:**
- Page background: `#f5f0eb` (warm off-white)
- Card/body background: `#ffffff`
- Card alt background: `#faf8f5`
- Border color: `#e8e2db`
- Divider color: `#e8e2db`
- Footer background: `#2d3b2d`
- Footer text: `rgba(200,215,180,0.6)`
- Footer links: `rgba(200,215,180,0.7)`
- Footer legal: `rgba(200,215,180,0.35)`

### Tag / Pill Colors (for modalities, categories)
- Green: bg `#eef3e6`, text `#5c6b4a`
- Warm: bg `#f3ede6`, text `#6b5a4a`
- Blue: bg `#e6edf3`, text `#4a5a6b`
- Rose: bg `#f3e6ed`, text `#6b4a5a`

### Buttons
- **Primary filled:** background `#2d3b2d`, text `#ffffff`, border-radius 50px, padding 12–14px 28–36px, font 12–13px DM Sans weight 500, letter-spacing 1–1.5px, uppercase.
- **Primary filled (on dark bg):** background `#c8d7b4`, text `#2d3b2d` (or use the relevant accent color for practitioner/warm themes).
- **Secondary outline:** border 1.5px solid `#2d3b2d`, text `#2d3b2d`, background transparent, same border-radius/padding/font as primary.

### Layout & Spacing
- Email max-width: 600px
- Top-level border-radius: 16px on hero (top) and footer (bottom) to create a rounded card feel
- Section padding: 40–48px horizontal, 36–48px vertical
- Mobile padding override: 24px horizontal
- Cards: border 1px solid `#e8e2db`, border-radius 12px
- Inner card backgrounds: `#faf8f5`
- Dividers: 1px solid `#e8e2db`, inset with 48px horizontal padding
- Accent divider (small decorative): 40px wide, 1px, centered

### Header (all emails)
- "ESTUARY" wordmark: Cormorant Garamond, 26px, weight 500, letter-spacing 6px, color `#2d3b2d`, uppercase, centered
- Small 40px sage divider below

### Footer (all emails)
- Background: `#2d3b2d`, border-radius 0 0 16px 16px
- "ESTUARY" wordmark: Cormorant Garamond, 20px, weight 500, letter-spacing 4px, color `#c8d7b4`
- Tagline: DM Sans 12px light, `rgba(200,215,180,0.6)`
- Navigation links row: DM Sans 11px, letter-spacing 1px, `rgba(200,215,180,0.7)`, separated by middots
- 40px decorative divider: `rgba(200,215,180,0.15)`
- Legal / copyright: DM Sans 11px light, `rgba(200,215,180,0.35)`
- Unsubscribe / Privacy / Preferences links: `rgba(200,215,180,0.5)`, underlined

### Iconography
- Use emoji as icons in circles (e.g., 🧘 🌿 ✨ 🔔 📋 💜 ✓ 🔍 🤝)
- Icon circles: 56–72px, border-radius 50%, background using accent color at 15% opacity, border 2px at 20% opacity
- Alternatively use text numbers in styled circles for step sequences

---

## Task

I'm attaching all of my current MJML email templates.

### CRITICAL: Do NOT rewrite or rebuild these templates from scratch. Adjust them in place.

These templates already have working structure, content, logic, and variables. Your job is to **restyle and adjust** — not recreate. Work within the existing MJML, swapping out colors, fonts, and styling to match the design system above. Keep the bones, change the skin.

### Steps

1. **First, visit our website** at the URLs above to understand the current look, feel, and tone.
2. **Read through every attached MJML template** carefully. Understand the structure, content, logic, and purpose of each email before touching anything.
3. **Adjust the styling of every template** to match the design system above:
   - Swap all fonts to Cormorant Garamond (headings) + DM Sans (body)
   - Swap all colors to the palette above — choose the correct hero gradient based on whether the email is user-facing, practitioner-facing, a reminder, or a review/feedback email
   - Adjust the header to use the ESTUARY wordmark style
   - Adjust the footer to match the design system
   - Adjust all buttons to match the pill-shaped style
   - Apply proper spacing, border-radius, and card styling
   - Make sure section labels use the uppercase sage eyebrow style

### Do NOT change any of the following:
   - **Template variables** — preserve every single dynamic variable exactly as-is (e.g., `{{first_name}}`, `{{session_date}}`, `{{practitioner_name}}`, etc.). Do not rename, remove, or rearrange them. They are wired to our backend.
   - **Conditional logic** — preserve all `mj-if` conditions, loops, conditional blocks, and any other template logic. Do not simplify, remove, or refactor them.
   - **Content and copy** — do not rewrite text, headlines, or CTAs unless something directly conflicts with the brand voice. The existing copy is intentional.
   - **MJML structure** — do not restructure sections, reorder blocks, or remove components. Adjust styling within the existing structure.

### Links — Verify and Fix

Go through every link in every template and make sure they point to the correct Estuary pages. Use this link map:

| Destination | Correct URL |
|---|---|
| Homepage | `https://estuary-frontend.onrender.com/` |
| Marketplace | `https://estuary-frontend.onrender.com/marketplace` |
| Practitioners | `https://estuary-frontend.onrender.com/marketplace/practitioners` |
| Sessions | `https://estuary-frontend.onrender.com/marketplace/sessions` |
| Workshops | `https://estuary-frontend.onrender.com/marketplace/workshops` |
| Courses | `https://estuary-frontend.onrender.com/marketplace/courses` |
| Streams | `https://estuary-frontend.onrender.com/streams` |
| Become a Practitioner | `https://estuary-frontend.onrender.com/become-practitioner` |
| About | `https://estuary-frontend.onrender.com/about` |
| Help Center | `https://estuary-frontend.onrender.com/help` |
| FAQ | `https://estuary-frontend.onrender.com/help/faq` |
| Practitioner Guide | `https://estuary-frontend.onrender.com/help/practitioners` |
| Community | `https://estuary-frontend.onrender.com/community` |
| Blog | `https://estuary-frontend.onrender.com/blog` |
| Contact | `https://estuary-frontend.onrender.com/contact` |
| Terms | `https://estuary-frontend.onrender.com/terms` |
| Privacy | `https://estuary-frontend.onrender.com/privacy` |
| Cookies | `https://estuary-frontend.onrender.com/cookies` |
| Modalities | `https://estuary-frontend.onrender.com/modalities` |

- If a link uses a dynamic variable (e.g., `{{booking_url}}`, `{{practitioner_profile_url}}`), leave it as-is — those are generated by our backend.
- If a link is hardcoded and points to a placeholder (`#`, `example.com`, or a wrong domain), replace it with the correct URL from the table above, or flag it if you're not sure where it should go.
- Make sure CTA buttons link to the most logical destination for the email's purpose (e.g., a booking confirmation "View Booking" button should use `{{booking_url}}`, not a hardcoded link).

### Fields — Sanity Check

For each template, verify that dynamic fields make sense in context:
- A booking confirmation should have: service name, practitioner name, date, time, format, duration, price
- A reminder should have: service name, practitioner name, date, time, format, join link
- A welcome email should have: first name
- A practitioner new-booking email should have: client name, service name, date, time, format, earnings, client note (if applicable)
- A review request should have: service name, practitioner name, date, review link

If a field is missing that clearly should be there, **flag it in a comment** (e.g., `<!-- MISSING: {{session_time}} should be here -->`) but do NOT invent new variable names. Just flag what's missing so we can wire it up on the backend.

### Output

- Output each updated MJML file separately with its **original filename** so I can drop them straight back into my codebase.
- If any template is missing key sections (like a proper header or footer), add them following the design system.
- At the end, provide a brief **changelog summary** for each file listing what you adjusted (e.g., "swapped colors, updated footer, fixed 2 broken links, flagged missing {{session_time}} field").

---

## Attached Files

[Upload your MJML files here]
