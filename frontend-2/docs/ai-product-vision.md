# Estuary AI Product Vision

## Context
Estuary is a wellness marketplace with booking (sessions, workshops, courses), a Patreon-like content platform (streams), video rooms, and 113 modalities across 13 categories. This document outlines how AI can fundamentally transform the platform for users, practitioners, and the system itself.

---

## For Users (People Seeking Wellness)

### AI Wellness Concierge
"I have chronic back pain and anxiety, I've tried yoga but didn't connect with it." The AI understands all 113 modalities, all practitioner profiles, reviews, availability, and pricing. It doesn't just search — it reasons about fit. "Based on what you've described, I'd suggest somatic experiencing with Sarah, she specializes in trauma-held-in-body work. She has openings Thursday. Want me to book?" This replaces the most broken part of wellness: not knowing what you need.

### Session Prep & Integration
Before a breathwork session, the AI sends: "Here's what to expect, don't eat 2 hours before, set up a comfortable space." After: "How did that feel? Common experiences include... Here are integration practices for the next 48 hours." This is the part practitioners wish they could do but don't have time for. It multiplies their impact.

### Structured Wellness Journaling
AI-guided journaling that connects to your booking history. "You had a Reiki session yesterday — how are you feeling today?" Over time it builds a wellness timeline. Practitioners (with permission) can see this context before sessions.

### Intelligent Scheduling
"I want to do breathwork weekly and therapy biweekly." AI manages the recurring schedule across multiple practitioners, finds time slots that work, handles rebooking when things conflict. Like a wellness executive assistant.

---

## For Practitioners (Creators/Providers)

### AI Content Assistant
Not just "write me a post" but contextual. It knows their modality, their audience's tier distribution, what content performed well. "Your premium subscribers engaged most with breathwork technique posts. Here's a draft for an advanced box breathing guide with your voice/style." Generates images, suggests scheduling.

### Client Insights
Before a session, the AI summarizes: "This client has booked 3 sessions with you, mentioned anxiety in their intake form, journaled about sleep issues this week." Practitioners currently go in blind.

### Smart Pricing
"Practitioners in your modality with similar experience charge $80-120/hr. Your booking rate is 90% — you could likely increase to $95 without losing volume." Data-driven pricing guidance.

### Automated Follow-up
After a session ends, AI handles: thank you message, feedback request, suggested next booking, relevant stream content recommendation. The practitioner sets the template, AI personalizes and sends.

---

## For the Platform (Systemic)

### AI-Powered Search & Discovery
Every search query, every page on the site becomes conversational. Not just keyword matching but understanding intent. "Something for grief" finds grief counselors, somatic therapists, meditation teachers who work with loss — across modalities the user didn't know existed.

### LLM-Discoverable Platform
Structured data so when someone asks ChatGPT/Perplexity "find me a breathwork practitioner in Portland," Estuary practitioners surface. First-mover advantage is real here. Build on existing llms.txt and modality SEO work.

### Modality Knowledge Base
AI that can explain any of the 113 modalities in depth, answer questions, compare approaches. "What's the difference between craniosacral therapy and Reiki?" This becomes SEO content, chat responses, and education all at once.

### Trust & Safety
AI-powered content moderation for streams (flag inappropriate content), session review analysis (detect concerning patterns), credential verification assistance.

---

## Architecture Foundation

1. **User preference/history model** — Structured profile of what each user has tried, liked, their goals, conditions. Feeds everything.
2. **Embeddings for practitioners and services** — Vector representations of what each practitioner offers, their style, specialties. Enables semantic matching.
3. **Event pipeline** — Every booking, stream view, like, session completion becomes an event that feeds recommendations.
4. **AI chat infrastructure** — Chat interface with tool access to booking API, practitioner search, stream search. Embedded everywhere, not a separate product.

---

*The biggest opportunity is the concierge. Wellness is confusing. People don't know what modality they need, they don't know how to evaluate practitioners, they don't know what to expect. An AI that bridges that gap — that's the product moat. Nobody else has 113 modalities + real practitioner data + booking capability in one system that an AI can orchestrate.*

---

## Top 5 Implementation Priorities

### 1. AI Wellness Concierge (Priority: Highest — Platform Moat)

**Why:** Every wellness marketplace has listings and search. Nobody has an AI that reasons across 113 modalities and books for you. The drop-off in wellness is at discovery — people don't know what they need, browse for 20 minutes, and leave. The concierge eliminates that.

**Implementation approach:**
- Claude as backbone with tool use: `search_practitioners`, `search_services`, `check_availability`, `create_booking`, `get_modality_info`
- Not a standalone chatbot page — embedded as a floating chat widget on every page, context-aware (knows what page you're browsing)
- System prompt loaded with modality taxonomy, gray-zone handling rules, practitioner-client fit reasoning
- Tools query the existing Django API — no new data layer for v1
- Start text chat only, no voice, not proactive on day 1
- Just a chat bubble: "Not sure what you need? Ask me."

### 2. Practitioner Content Assistant (Priority: High — Retention)

**Why:** Practitioner churn is the biggest business risk. If they don't create content, streams die, subscribers leave. Most wellness practitioners are amazing at their craft and terrible at content creation.

**Implementation approach:**
- "AI Assist" tab inside create post dialog
- Practitioner describes topic in one sentence → AI generates full draft in their voice
- Context: last 10 posts (tone matching), modality expertise, subscriber tier distribution (suggest gating), linked services (suggest embedding booking card)
- Not a generic writer — a wellness content expert speaking as that specific practitioner
- v1: draft generation. v2: image suggestions, SEO optimization, A/B title testing

### 3. AI-Powered Search & Discovery (Priority: High — Conversion)

**Why:** Current search is keyword-based. "Help with stress" won't find a somatic experiencing practitioner unless those exact words are in their profile. Semantic search compounds with every practitioner added.

**Implementation approach:**
- Layer 1: Generate embeddings (pgvector on existing Postgres) for every practitioner profile, service, stream post, modality
- Layer 2: Embed user query → similarity search → top 20 results → Claude ranks and explains relevance
- "Sarah is a strong match because somatic experiencing directly addresses grief held in the body"
- Build incrementally: Week 1 embeddings, Week 2 semantic endpoint, Week 3 AI ranking. Each step independently valuable.

### 4. Session Prep & Integration (Priority: Medium — Practitioner Lock-in)

**Why:** This makes practitioners say "I can't leave Estuary." It does what they wish they could do for every client but don't have time for. Deepens client experience like no other platform.

**Implementation approach:**
- Triggered by existing booking system. Booking confirmed → background job fires
- AI generates prep message from: service type, practitioner preferences, modality knowledge base, user wellness history
- Sent via email/notification 24h before. Follow-up 2h after session ends
- Practitioner controls the template, AI personalizes per client
- Practitioner reviews first few, then autopilot
- Temporal workflow (already in stack) — prep job at booking time, follow-up at session end

### 5. LLM-Discoverable Platform (Priority: Medium — Growth/SEO of AI Era)

**Why:** This is the SEO land grab of the AI era. When someone asks ChatGPT "find me a meditation teacher," the first platform that surfaces with real data wins. Nobody in wellness is doing this yet.

**Implementation approach:**
- Rich JSON-LD for every practitioner, service, modality page (beyond basic Schema.org)
- AI search API endpoint: `/api/v1/ai/search` — accepts natural language, returns structured recommendations
- Publish as MCP server + OpenAPI spec that AI assistants can call
- `/well-known/ai-plugin.json` for ChatGPT plugin format
- Build on existing llms.txt and modality SEO work
- Equivalent of being the first restaurant on Google Maps — except the map is now every AI assistant in the world

---

## Market Analysis & Opportunity

### Global Wellness Market
- **$5.6 trillion** global wellness economy (Global Wellness Institute, 2024)
- **$1.8 trillion** in personal wellness (nutrition, fitness, mental health, mindfulness)
- Growing at **5-10% annually**, accelerating post-pandemic
- Digital wellness specifically growing at **15-20% CAGR**

### Key Niches & Segments

**Mental Health & Therapy (Largest, most competitive)**
- BetterHelp, Talkspace dominate traditional therapy
- Gap: alternative/holistic mental health (somatic, breathwork, EMDR, energy healing)
- Estuary's angle: the modalities they don't cover

**Breathwork & Somatic Practices (Fast-growing, underserved)**
- Exploding interest (Google Trends up 300% since 2020)
- No dominant marketplace — practitioners use Instagram DMs and Calendly
- High willingness to pay ($80-200/session)
- Strong stream/content potential (guided sessions, technique videos)

**Yoga & Meditation (Large, saturated for generic, open for specialized)**
- Generic yoga is saturated (ClassPass, Mindbody)
- Niche opportunity: therapeutic yoga, yoga nidra, kundalini, trauma-sensitive yoga
- Meditation niches: Vedic, transcendental, vipassana — each has devoted followers

**Energy Healing & Bodywork (Loyal clientele, recurring revenue)**
- Reiki, craniosacral, acupuncture, sound healing
- Clients are deeply loyal — once they find their practitioner, they stay for years
- Strong recurring booking potential
- Content/streams: education about energy work, self-practice guides

**Psychedelic Integration (Emerging, high-value, regulatory tailwind)**
- Legal psychedelic therapy expanding (Oregon, Colorado, more states coming)
- Integration coaches, preparation therapists, harm reduction specialists
- Very high per-session value ($150-500)
- Content streams: extremely engaged audience
- Regulatory advantage: first compliant marketplace wins

**Corporate Wellness (B2B opportunity)**
- Companies spending $50B+/year on employee wellness
- Current offerings are generic (gym memberships, meditation app subscriptions)
- Opportunity: curated practitioner marketplaces for companies ("Book any of our 50 breathwork instructors for your team")
- Higher contract values, predictable revenue

**Women's Health & Fertility (Underserved, passionate market)**
- Fertility support, postpartum care, hormonal health
- Combines multiple modalities: acupuncture, nutrition, yoga, therapy
- High emotional investment = high willingness to pay and engage with content
- Strong community/stream potential

### Competitive Landscape
- **Mindbody/ClassPass**: Gym/studio focused, not practitioner-individual focused
- **BetterHelp/Talkspace**: Traditional therapy only, no alternative modalities
- **Headspace/Calm**: Content only, no real practitioners
- **Insight Timer**: Meditation community, no booking
- **Zocdoc**: Medical appointments, not wellness
- **No one** does: holistic modality marketplace + content platform + AI matching + video sessions in one system

### Revenue Model Opportunities
- **Transaction fees**: 5-15% on bookings (current model)
- **Subscription revenue share**: 15-20% on stream subscriptions (current model)
- **SaaS tier for practitioners**: Monthly fee for premium tools (AI content assistant, analytics, automation)
- **B2B corporate plans**: Per-employee-per-month for corporate wellness programs
- **AI concierge premium**: Free basic matching, premium for personalized wellness plans
- **Certification/credentialing**: Charge practitioners for verified credential badges
- **Continuing education**: Host CE/CME courses that practitioners need for license renewal

### The AI Angle as Differentiator
The wellness space is fragmented precisely because it's confusing. 113 modalities means 113 different rabbit holes a user can go down. Traditional search and filtering can't solve this — it requires reasoning. AI is the first technology that can actually bridge the gap between "I don't feel right" and "here's the specific practitioner and modality that fits your situation." This is not AI for AI's sake — it's AI solving the core problem of the industry.
