The two absolute blockers before any workshop goes live are the false 100% completion state (wizard finishes but service is "Not Bookable") and the missing address field for in-person services — both will cause practitioner confusion and client drop-off immediately. The broken image generation button is also P1 since it's a hero feature of the wizard.
The P2 items (location multi-select, duration button sync bug, pricing guidance) are straightforward UX fixes that should ship in the same sprint. The P3 missing fields (intake form, participant requirements, terms) are especially important for workshop and in-person service types where Estuary's practitioner base skews.
A few things worth flagging
The "false completion" issue is a product trust problem, not just a UX bug. If practitioners publish a workshop they think is ready and then get zero bookings because it has no date, that's a retention risk. Either the wizard needs to collect dates for workshops, or the completion language needs to be completely reworked.
The intake form gap is actually a safety concern for the ceremonies and trauma-adjacent sessions Estuary's practitioners run. Worth flagging as higher priority than it might look on paper.
The P4 enhancements (chip selector, structured "What's Included" list, moving Level Up cards in-flow) all directly affect marketplace search quality and client conversion — they're worth sequencing sooner than backlog if bandwidth allows.

SERVICE CREATION WIZARD
Step 1 — Service Type No issues.
Step 2 — What is it?
[P4 Feature] Add a "who is this for" chip selector alongside the description. Multi-select tags like stress, grief, chronic pain, spiritual growth. Powers marketplace filtering and helps clients self-qualify.
[P4 UX] Replace the freeform "What's Included" text area with a structured list builder (add-item rows, draggable). Renders as clean bullet/check list on the public profile.
Step 3 — How will you deliver it?
[P1 Bug] Selecting "In-Person" shows a Location Type toggle but no address field. The address input only appears post-publish in the settings panel. Fix: when In-Person is selected, immediately render an address field inline. Should be required before advancing.
[P2 UX] Location Type is a toggle (Virtual / In-Person) with no "Both" option. Many practitioners offer both formats. Fix: convert to multi-select checkboxes and add a "Client's Choice / Both" option. When both are selected, show address + virtual link fields together.
[P2 UX] Price field defaults to $0 with no guidance. Fix: add contextual placeholder or tooltip with typical pricing for the service type/modality (e.g. "Energy healers on Estuary typically charge $80–$180/session").
[P2 Bug] Duration quick-buttons (30m, 45m, 1h, etc.) don't sync with the number input field. You can have "60" typed and "1h" highlighted at the same time. Fix: clicking a quick-button should clear and update the number field. Manual number entry should deselect all buttons. One active state at a time.
Step 4 — Image
[P1 Bug] "Generate Image" button is completely unresponsive with no loading state and no error message. Fix: add a loading spinner on click, surface a visible error if generation fails (e.g. "Image generation failed — try again"). Confirm the API call is wired correctly.
Step 5 — Review & Publish No issues with the review card itself — it looks polished.

COMPLETION SCREEN (post-publish)
[P1 Flow] Wizard shows 100% progress, but the settings panel immediately shows 80% completion with two orange warning icons and a "Not Bookable" alert. Fix: either (A) add the missing required steps (date/time, address) into the wizard so it truly is complete, or (B) change the final screen to explicitly say "Your service is visible but not yet bookable — complete setup below" with direct links to the two incomplete sections. Do not show 100% if the service can't be booked.
[P4 UX] "Level Up Your Service" cards (Learning Goals, Resources, Terms) appear here as post-publish nudges that most users will skip. Fix: move these into the wizard as an optional step or accordion before publish. Keep them skippable but in-flow.

SETTINGS PANEL — Sessions & Schedule
[P1 Flow] Workshop publishes with no scheduled date or time and is immediately flagged "Not Bookable." Fix: for the Workshop service type, add a date/time step inside the wizard, or at minimum surface a hard-to-miss CTA on the completion screen: "Add a date to make this bookable →" linking directly to Sessions & Schedule.

SETTINGS PANEL — Location & Delivery
[P1 Flow] The "Select Address" field with "+ Add New Location" exists here but is entirely absent from the wizard. By the time a practitioner lands here, they may not realize their service is unpublishable without it. This is addressed by the Step 3 fix above — surfacing address collection in the wizard eliminates the gap.

SETTINGS PANEL — Participant Requirements (missing/undiscoverable)
[P3 Feature] Experience level (Beginner / All Levels / Intermediate / Advanced) and age range fields exist in settings but are never surfaced during setup. Fix: add to Step 2 as an optional "Who is this for?" section with dropdowns.

SETTINGS PANEL — Intake Form (missing/undiscoverable)
[P3 Feature] The intake form system exists but practitioners won't find it. For shamanic ceremonies, somatic work, and trauma-adjacent workshops, intake forms are a safety requirement. Fix: on the completion screen or in Step 2, add a conditional prompt for in-person / ceremonial service types: "Do you want to add an intake form?" Link directly to intake form setup.

SETTINGS PANEL — Terms & Cancellation Policy (missing/undiscoverable)
[P3 Feature] A "Service-Specific Terms" field exists in settings but is never mentioned during the wizard. Critical for full-day in-person events where no-shows have real cost implications. Fix: surface on the completion screen as a recommended next step with clear label: "Add cancellation policy (recommended for in-person events)."

UX Review: Practitioner Perspective
What worked well: The 5-step wizard format is genuinely pleasant. The progress bar (20% → 100%) gives a satisfying sense of momentum, and having separate Brief Description vs Full Description fields is smart — practitioners like Shaman Dave who have rich, story-driven offerings can write a punchy search blurb and a full narrative separately. The auto-populating AI image prompt (which pulled directly from the description) was a nice touch in concept. The final review step before publishing is reassuring.
What felt rough: The wizard is misleadingly "complete-looking." You hit 100% and it goes live — but when you land in the settings panel, you're immediately shown an 80% completion score and two orange warning icons on Sessions & Schedule and (until you add a location) Location & Delivery. So the wizard creates a false sense of done-ness. A practitioner could genuinely think their workshop is fully set up, not realising clients cannot actually book it because no date has been added. The platform even shows a "Not Bookable" alert in the Status & Visibility section confirming this.
The Generate Image button also appeared completely unresponsive during the creation flow, which is a frustrating dead end with no error message — a practitioner would be left confused.

Yes — The Location Field Was Missing
You're absolutely right to flag it. During Step 3 of the creation wizard ("How will you deliver it?"), selecting In-Person only showed a Location Type toggle — there was no follow-up field to enter an actual address. The Physical Location / Select Address field only appears later, buried in the settings panel under "Location & Delivery." For a practitioner, this is a real gap — you'd expect selecting In-Person to immediately prompt you for where.

Fields Missing / Needed for an In-Person Workshop
After exploring the full settings panel, here's what the creation wizard doesn't collect but an in-person event genuinely needs:
Critical (currently Required but deferred to settings):
Session date & time — The workshop has no scheduled date at all. It's marked "Not Bookable" as a result. This should arguably be part of the creation wizard for a workshop.
Physical address / venue — The "Select Address" dropdown (with "+ Add New Location") is entirely absent from the wizard. Clients have no idea where to show up.
Important but optional (only discoverable in settings):
Participant Requirements — Experience level (beginner/all levels), minimum/maximum age. Relevant for a full-day ceremony.
Intake Form — Critical for a shamanic workshop. You'd want to know about participants' mental health, trauma history, medications, etc. before a deep ceremony. The intake form system exists but isn't prompted during setup.
Terms & Conditions / Cancellation Policy — There's a free-text "Service-Specific Terms" field that would be very important for a full-day in-person event (no-show policy, refund window, etc.). Not mentioned during the wizard at all.
Available From / Until dates — Controls the booking window, useful if you want to close bookings a week before the event.
What You'll Learn / Prerequisites — These exist in the Content section but weren't part of the core wizard flow.
In short: the wizard gets you to "visible" but not "bookable" or "complete" for an in-person workshop. The two most glaring gaps are no date/time and no venue address — both of which are deal-breakers for clients trying to actually attend.

Overall the service creation flow was genuinely impressive — here are my honest thoughts:
What worked really well:

The 5-step structure with a progress bar felt proportionate and never overwhelming. Separating "what is it" (Step 2) from "how do you deliver it" (Step 3) is a smart split — it keeps each page focused. The service type picker on Step 1 (Session, Workshop, Course, Package, Bundle) is clear and well-labeled with examples, which removes a lot of guesswork for a new practitioner.
The AI image generation on Step 4 was genuinely delightful — it auto-populated the prompt from the service description, which was a nice touch, and the generated image was actually really good quality. That's a strong feature for practitioners who don't have professional photography. The review card on Step 5 also looked polished and professional, showing exactly what clients will see.
What could be better:

The biggest missing piece is that Location Type only lets you choose Virtual or In-Person, not both. Shiva explicitly offers both formats, and plenty of practitioners do — there should be a "Both / Client's Choice" option or the ability to multi-select. Right now you'd have to create two separate services to cover this, which is messy.
The price field defaulted to $0 with no guidance on typical pricing for this type of service. Even a light prompt like "Energy healers on Estuary typically charge $80–$180/hr" would help practitioners calibrate without feeling lost.
The duration quick-buttons (30m, 45m, 1h, 1.5h, 2h, 3h) were handy but I noticed they don't lock the number field — you could type 60 and also have 1h highlighted, which could confuse users about which value is actually active.
What I'd change:
I'd add a "tags" or "who is this for" field in Step 2 alongside the description — something like "ideal for clients experiencing: stress, grief, chronic pain" with selectable chips. This would help clients self-qualify and improve search/filtering on the marketplace side. The "What's Included" field was a bit buried and freeform — a structured list builder (similar to how you add certifications) would look better when rendered on the client-facing profile.
Finally, the "Level Up Your Service" cards on the completion screen (Learning Goals, Resources, Terms) are great ideas but felt like afterthoughts. They'd be better integrated as optional steps within the main flow rather than post-publish nudges that many users will click past.

