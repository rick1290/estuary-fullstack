# Feature #1: Intake & Consent Forms

**Priority:** High
**Status:** Planned
**Estimated scope:** New Django app + ~10 frontend files

---

## Problem
Practitioners get zero context before a session — just a name and a time. A breathwork practitioner doesn't know their client has asthma. A trauma-informed yoga teacher doesn't know about a recent car accident. Meanwhile, practitioners in regulated modalities need signed consent/liability waivers but manage them via paper or DocuSign outside the platform.

## Solution
Per-service configurable intake questionnaires and consent forms that clients complete after booking, before their session.

## UX Flow

### Client Side
1. Books and pays → confirmation page shows "Complete Pre-Session Form" CTA
2. If skipped → email reminder at 48h and 24h before session
3. Booking detail page shows persistent banner until forms done
4. For required consent → room lobby blocks entry until signed
5. Returning clients → previous answers pre-filled, one-click confirm

### Practitioner Side
1. Creates form templates in dashboard (or clones platform templates)
2. Attaches forms to specific services (breathwork intake ≠ meditation intake)
3. Configures: consent required (blocks room) or recommended, intake optional
4. Before session: sees consent status + intake responses on booking detail
5. Client detail page: longitudinal intake history across all sessions

### Key Decisions
- **Not during checkout** — kills conversion. Separate step after payment.
- **Forms per service, not global** — different services need different questions
- **100% opt-in for practitioners** — no forms = zero change to existing flow
- **Consent is versioned & immutable** — legal protection, old signatures reference old text
- **Platform ships default templates** — breathwork, yoga, energy healing, massage, psychedelic integration, general wellness

## Data Model

### New Django app: `intake`

**FormTemplate** — Practitioner's reusable form (or platform template)
- practitioner (FK, nullable for platform templates)
- title, form_type ('intake' | 'consent'), is_platform_template
- modality (FK, nullable — for template suggestions)

**FormQuestion** — Individual question in an intake form
- template (FK), question_type, label, help_text, is_required, options (JSON), order

**ConsentDocument** — Versioned legal text (immutable once created)
- template (FK), version (auto-increment), legal_text

**ServiceForm** — Links forms to services
- service (FK), form_template (FK), is_required, order

**IntakeResponse** — Client's answers
- booking (FK), form_template (FK), user (FK), responses (JSON blob), submitted_at
- is_prefilled (bool), previous_response (FK to self for tracking changes)

**ConsentSignature** — Legal e-signature
- booking (FK), consent_document (FK to specific version), user (FK)
- signer_name, signed_at, ip_address, user_agent

## API Endpoints

```
# Practitioner form management
CRUD   /api/v1/intake/templates/
CRUD   /api/v1/intake/templates/{id}/questions/
POST   /api/v1/intake/templates/{id}/clone/
GET    /api/v1/intake/platform-templates/

# Service attachment
GET/POST /api/v1/services/{id}/forms/
DELETE   /api/v1/services/{id}/forms/{sf_id}/

# Client submission
GET    /api/v1/bookings/{uuid}/forms/          — get forms + previous responses
POST   /api/v1/bookings/{uuid}/forms/intake/   — submit intake
POST   /api/v1/bookings/{uuid}/forms/consent/  — sign consent

# Practitioner view
GET    /api/v1/bookings/{uuid}/forms/responses/
GET    /api/v1/practitioners/clients/{id}/intake-history/
```

## Frontend Pages

### New
- `dashboard/practitioner/intake/` — form templates list
- `dashboard/practitioner/intake/builder` — form template builder
- `dashboard/practitioner/intake/browse` — platform template browser
- `dashboard/user/bookings/[id]/forms/` — client form submission page

### Modified
- `checkout/confirmation/` — add "Complete Form" CTA
- `dashboard/user/bookings/[id]/` — add form status banner
- `room/[roomId]/lobby/` — add consent gate
- `dashboard/practitioner/bookings/[id]/` — add responses view
- `dashboard/practitioner/clients/[id]/` — add intake history

## Platform Templates (Seed Data)

| Modality | Consent Template | Intake Template |
|----------|-----------------|-----------------|
| Breathwork | Hyperventilation risks, contraindications | Respiratory conditions, medications, experience level |
| Yoga | Physical injury liability | Injuries, limitations, experience, pregnancy |
| Energy Healing | Complementary not medical disclaimer | Current conditions, expectations, medications |
| Massage/Bodywork | Physical contact consent | Areas of concern, pressure preference, allergies |
| Psychedelic Integration | Detailed informed consent | Mental health history, medications, support system |
| General Wellness | Basic liability waiver | Goals, health conditions, experience level |

## Room Access Gate
The existing `check_access` endpoint on rooms adds two new fields:
- `consent_required: boolean`
- `consent_signed: boolean`
If consent is required but not signed, `can_join = false` with `reason = 'consent_required'`. The lobby page shows the consent form inline.

## Verification Checklist
- [ ] Practitioner creates intake form with 5 questions
- [ ] Practitioner creates consent form with legal text
- [ ] Both attached to a service (consent required, intake optional)
- [ ] Client books → confirmation shows "Complete Form" CTA
- [ ] Client fills out → consent signed with timestamp/IP, intake submitted
- [ ] Client skips → reminder emails at 48h and 24h
- [ ] Required consent not signed → room lobby blocks with inline consent
- [ ] Consent signed in lobby → access granted
- [ ] Practitioner sees responses before session
- [ ] Returning client → intake pre-filled, consent auto-carried if same version
- [ ] Practitioner updates consent → new version → returning clients must re-sign
- [ ] Client history → timeline of all intake responses
