# Website Production-Readiness Audit Prompt

## How to Use

Copy the prompt below and give it to an AI agent (like Claude) along with your website URL, codebase, or screenshots. Customize the sections in `[brackets]` to fit your project.

---

## The Prompt

```
You are a senior full-stack engineer, UI/UX designer, and SEO specialist performing
a comprehensive production-readiness audit on [WEBSITE URL / CODEBASE].

Your job is to be brutally honest. Flag everything — from critical blockers to
minor polish issues. Organize your findings by severity:
🔴 CRITICAL (blocks launch), 🟡 WARNING (should fix before launch), 🟢 SUGGESTION (nice to have).

Audit every category below. For each issue found, provide:
1. What the problem is
2. Where it occurs (specific page, component, or line)
3. Why it matters
4. How to fix it (concrete, actionable steps)

---

### 1. CODE QUALITY & PERFORMANCE

- [ ] Are there any unused imports, dead code, or orphaned components?
- [ ] Are there console.log statements, TODO comments, or debug artifacts left in?
- [ ] Is the code DRY (Don't Repeat Yourself) — are there duplicated components, styles, or logic that should be abstracted?
- [ ] Are components properly modularized and reusable, or are there monolithic files?
- [ ] Is state management clean? Are there prop-drilling chains that should use context/store?
- [ ] Are there any memory leaks (uncleared intervals, unsubscribed listeners, unclosed connections)?
- [ ] Are API calls handled properly (loading states, error states, retries, cancellation)?
- [ ] Is there proper error boundary / fallback UI implementation?
- [ ] Are environment variables properly configured (no hardcoded secrets, API keys, or dev URLs)?
- [ ] Is the bundle size reasonable? Are there oversized dependencies that could be replaced or tree-shaken?
- [ ] Are images optimized (proper formats like WebP/AVIF, lazy loading, srcset for responsive sizes)?
- [ ] Is code-splitting / lazy loading implemented for routes and heavy components?
- [ ] Are fonts loaded efficiently (font-display: swap, preloaded, subset if possible)?
- [ ] Run a Lighthouse audit — what are the Performance, Accessibility, Best Practices, and SEO scores?
- [ ] Is there a caching strategy in place (HTTP headers, service worker, CDN)?
- [ ] Are CSS files purged of unused styles?
- [ ] Are there render-blocking resources that could be deferred or async-loaded?

### 2. UI / VISUAL DESIGN AUDIT

- [ ] Is the design system consistent? (Same border-radius, shadows, spacing scale, color palette everywhere)
- [ ] Are colors defined as design tokens / CSS variables, or are there hardcoded hex values scattered around?
- [ ] Is typography consistent? (Limited font families, clear hierarchy with heading/body/caption sizes)
- [ ] Is there sufficient color contrast for readability (WCAG AA minimum: 4.5:1 for text)?
- [ ] Are interactive elements (buttons, links, inputs) visually distinct and have clear hover/focus/active states?
- [ ] Is the spacing system consistent (using a scale like 4px/8px/16px/24px/32px)?
- [ ] Are icons consistent in style, weight, and size?
- [ ] Are there any orphaned or one-off design patterns that break consistency?
- [ ] Is the visual hierarchy clear — can a user immediately tell what's most important on each page?
- [ ] Are empty states designed (empty lists, no search results, no data)?
- [ ] Are loading states designed (skeleton screens, spinners, progress indicators)?
- [ ] Are error states designed (form errors, 404, 500, network errors)?
- [ ] Are success states designed (confirmations, toast notifications)?
- [ ] Is the overall design modern, polished, and professional — or does it look like a template/prototype?
- [ ] Are there any visual bugs (overlapping elements, cut-off text, misaligned items)?

### 3. RESPONSIVE DESIGN & CROSS-BROWSER

- [ ] Does the layout work on mobile (320px), tablet (768px), small desktop (1024px), and large desktop (1440px+)?
- [ ] Are there horizontal scroll issues on any viewport?
- [ ] Are touch targets large enough on mobile (minimum 44x44px)?
- [ ] Is text readable on mobile without zooming?
- [ ] Do navigation patterns adapt properly (hamburger menu, collapsible sections)?
- [ ] Are images and media responsive (don't overflow containers)?
- [ ] Are modals, dropdowns, and popovers usable on mobile?
- [ ] Does the site work on Chrome, Firefox, Safari, and Edge?
- [ ] Are there any CSS features used without fallbacks (check Can I Use)?
- [ ] Is the viewport meta tag properly set?

### 4. USER FLOW & UX

- [ ] Can a brand-new user understand what the site does within 5 seconds of landing?
- [ ] Is the primary call-to-action obvious on every key page?
- [ ] Is the navigation intuitive — can users find any page within 3 clicks?
- [ ] Are forms user-friendly (proper labels, placeholder text, inline validation, clear error messages)?
- [ ] Is form validation happening on both client and server side?
- [ ] Are there unnecessary steps in any flow that could be simplified or removed?
- [ ] Is there a clear visual flow guiding users through multi-step processes?
- [ ] Are confirmation dialogs used before destructive actions (delete, cancel subscription)?
- [ ] Is there a clear way to undo or go back at every step?
- [ ] Does the back button work as expected everywhere (no broken history states)?
- [ ] Are there dead ends where a user gets stuck with no clear next action?
- [ ] Is the onboarding flow (if any) smooth and not overwhelming?
- [ ] Are success moments celebrated (micro-interactions, confirmations)?
- [ ] Is the search functionality effective (if applicable)?
- [ ] Are there breadcrumbs or clear location indicators on deep pages?

### 5. URL STRUCTURE & ROUTING

- [ ] Do all URL paths make business sense? (e.g., `/pricing` not `/page-3`, `/blog/seo-guide` not `/blog/12345`)
- [ ] Are URL paths human-readable and descriptive of the content they serve?
- [ ] Is the URL hierarchy logical and reflects the site's information architecture? (e.g., `/products/widgets/blue-widget`)
- [ ] Are URLs consistent in naming convention (all lowercase, hyphens, no trailing slashes or mixed patterns)?
- [ ] Are there any legacy, confusing, or auto-generated route paths that should be renamed?
- [ ] Do dynamic routes use meaningful slugs instead of raw IDs? (e.g., `/blog/how-to-audit` not `/blog/6847a3f`)
- [ ] Are route params and query strings used appropriately (params for resources, query strings for filters/sort)?
- [ ] Are there any orphaned routes — pages that exist in the router but aren't linked from anywhere?
- [ ] Are there duplicate routes pointing to the same content?
- [ ] Do protected routes properly redirect unauthenticated users (not just hide the UI)?
- [ ] Is there a clear, documented route map / sitemap that matches the actual app routes?
- [ ] Are wildcard / catch-all routes handled gracefully?
- [ ] Do route changes update the browser URL, page title, and scroll position correctly?
- [ ] Are deep links shareable — does pasting a URL load the correct page state?
- [ ] If using hash-based routing, is there a reason not to use proper path-based routing?

### 6. SEO & METADATA

- [ ] Does every page have a unique, descriptive `<title>` tag (50-60 characters)?
- [ ] Does every page have a unique `<meta name="description">` (150-160 characters)?
- [ ] Is there a proper heading hierarchy (single H1 per page, logical H2/H3 nesting)?
- [ ] Are images using descriptive `alt` attributes?
- [ ] Is there a sitemap.xml and is it submitted to search engines?
- [ ] Is there a robots.txt and is it correctly configured?
- [ ] Are URLs clean, descriptive, and using hyphens (not underscores or query strings)?
- [ ] Is there proper canonical URL implementation to prevent duplicate content?
- [ ] Is Open Graph metadata set for social sharing (og:title, og:description, og:image)?
- [ ] Is Twitter Card metadata set?
- [ ] Is structured data / JSON-LD implemented where relevant (Organization, Product, Article, FAQ, etc.)?
- [ ] Are internal links used effectively with descriptive anchor text?
- [ ] Is the site using HTTPS everywhere?
- [ ] Are there any broken links (internal or external)?
- [ ] Is the site indexed properly (check with `site:yourdomain.com`)?
- [ ] Are there 301 redirects for any changed or removed URLs?
- [ ] Is page load speed under 3 seconds (Core Web Vitals: LCP, FID/INP, CLS)?
- [ ] Is the site mobile-friendly per Google's standards?
- [ ] Is there an XML sitemap with proper lastmod dates?
- [ ] Are pagination and infinite scroll SEO-friendly?

### 7. ACCESSIBILITY (a11y)

- [ ] Can the entire site be navigated with keyboard only (Tab, Enter, Escape, Arrow keys)?
- [ ] Is there a visible focus indicator on all interactive elements?
- [ ] Are all form inputs associated with `<label>` elements?
- [ ] Are ARIA roles and attributes used correctly (not overused or misused)?
- [ ] Do screen readers announce content in a logical order?
- [ ] Are dynamic content changes announced to assistive technology (aria-live regions)?
- [ ] Are decorative images marked with `alt=""` and informational images described?
- [ ] Is there sufficient color contrast (4.5:1 for normal text, 3:1 for large text)?
- [ ] Is information conveyed through more than just color alone?
- [ ] Are videos captioned and do audio elements have transcripts?
- [ ] Are skip navigation links provided?
- [ ] Do custom components (dropdowns, modals, tabs) follow WAI-ARIA patterns?

### 8. SECURITY & INFRASTRUCTURE

- [ ] Is HTTPS enforced with a valid SSL certificate?
- [ ] Are HTTP security headers set (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)?
- [ ] Is user input sanitized to prevent XSS?
- [ ] Is authentication implemented securely (token handling, session management)?
- [ ] Are API endpoints protected with proper authorization?
- [ ] Are CORS policies properly configured?
- [ ] Is there rate limiting on forms and API endpoints?
- [ ] Are sensitive routes protected (admin panels, user data)?
- [ ] Are dependencies up to date with no known vulnerabilities (`npm audit` / `pip audit`)?
- [ ] Is there proper logging and error monitoring set up (Sentry, LogRocket, etc.)?
- [ ] Is there a CI/CD pipeline with automated tests?
- [ ] Is there a staging environment that mirrors production?
- [ ] Are database queries optimized and protected against injection?
- [ ] Is there a backup and disaster recovery strategy?

### 9. BACKEND API & ARCHITECTURE

- [ ] Are all API endpoints actually being used by the frontend? Identify and flag any dead/orphaned endpoints.
- [ ] Are there frontend features making direct DB calls or duplicating logic that should be a proper API endpoint?
- [ ] Is there an OpenAPI / Swagger spec defined for the API? If not, there should be.
- [ ] If using OpenAPI, is the spec up to date and matching the actual implementation (no drift)?
- [ ] Is a code generation tool like HeyAPI, openapi-typescript, or orval being used to auto-generate TypeScript types and API clients from the spec? (If not, you're maintaining types by hand — stop doing that.)
- [ ] Are API client functions auto-generated or hand-written? Hand-written fetch calls for every endpoint is a maintenance nightmare.
- [ ] Are request/response types shared between frontend and backend, or are they duplicated and potentially out of sync?
- [ ] Is API versioning in place (e.g., `/api/v1/`) for future breaking changes?
- [ ] Are API responses consistently structured (same envelope format, error shape, pagination format)?
- [ ] Are HTTP methods used correctly (GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletes)?
- [ ] Are HTTP status codes used correctly (not returning 200 for errors with an error message in the body)?
- [ ] Are API endpoints following RESTful naming conventions (nouns, not verbs — `/users` not `/getUsers`)?
- [ ] Is there proper input validation on every endpoint (types, required fields, length limits, allowed values)?
- [ ] Are N+1 query problems present? (Multiple sequential DB calls that should be a single join/batch)
- [ ] Are expensive queries cached (Redis, in-memory, CDN edge)?
- [ ] Is there pagination on all list endpoints (not returning unbounded arrays)?
- [ ] Are there proper indexes on frequently queried database columns?
- [ ] Is there request/response logging for debugging (without logging sensitive data)?
- [ ] Are long-running operations handled async (background jobs, queues, webhooks) instead of blocking the request?
- [ ] Is there a health check endpoint (`/health` or `/api/health`) for monitoring?
- [ ] Are database migrations version-controlled and reversible?
- [ ] Is there API documentation accessible to the team (Swagger UI, Redoc, Postman collection)?
- [ ] Are there integration tests covering critical API flows?
- [ ] Are WebSocket connections (if any) properly managed with reconnection logic and heartbeats?

### 10. LEGAL & COMPLIANCE

- [ ] Is there a Privacy Policy page?
- [ ] Is there a Terms of Service page?
- [ ] Is there a cookie consent banner (if required by GDPR/CCPA)?
- [ ] Are third-party scripts and trackers disclosed?
- [ ] Is data collection minimized and justified?
- [ ] Are there proper data deletion / account deletion flows?
- [ ] Is there a contact page or support channel?

### 11. POLISH & PRODUCTION DETAILS

- [ ] Is the favicon set (including apple-touch-icon and various sizes)?
- [ ] Is the 404 page designed and helpful (not a default error)?
- [ ] Is the 500 / error page designed?
- [ ] Are social share previews correct (test with Facebook debugger, Twitter card validator)?
- [ ] Is analytics set up (Google Analytics, Plausible, PostHog, etc.)?
- [ ] Are all placeholder/dummy content and Lorem Ipsum replaced?
- [ ] Are all test accounts and seed data removed?
- [ ] Is the copyright year current?
- [ ] Are all external links working and opening in new tabs where appropriate?
- [ ] Is print styling considered (if relevant)?
- [ ] Is there a manifest.json for PWA support (if applicable)?

---

### OUTPUT FORMAT

Deliver your audit as a structured report with:

1. **Executive Summary** — Overall readiness score (0-100) and top 5 most critical issues.
2. **Findings by Category** — Each category above with issues listed by severity (🔴 🟡 🟢).
3. **Quick Wins** — Issues that take under 30 minutes to fix but have high impact.
4. **Action Plan** — A prioritized punch list ordered by: critical fixes → high-impact improvements → polish.
5. **What's Working Well** — Call out things done right (good patterns to maintain).

Be specific. Reference exact pages, components, CSS classes, and code snippets.
Don't be vague — "improve performance" is useless; "lazy-load the 2.4MB hero image
on /about using next/image with priority={false}" is useful.
```

---

## Tips for Best Results

- **Provide access to your actual codebase** (GitHub repo, zip, or paste key files) for the deepest audit.
- **Share your Lighthouse report** screenshots so the agent has real performance data.
- **Share your target audience** so the agent can evaluate UX through the right lens.
- **Run this audit in stages** if your site is large — break it into frontend, backend, and content audits.
- **Re-run after fixes** to verify issues are resolved and no regressions were introduced.
