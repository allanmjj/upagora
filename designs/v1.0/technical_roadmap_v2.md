# Soul Town — Technical Implementation Roadmap v2

**Author**: Hermes Agent + Ma Junjie | 2026-05-28 | For team + investors

---

## Current Architecture (as of May 2026)

```
Frontend: Next.js 15 + TypeScript + Tailwind + Supabase
API Layer: Next.js API routes (REST + SSE streaming)
Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
AI: DeepSeek / OpenRouter / Anthropic (3-tier fallback)
Deploy: Vercel (frontend) + Supabase (backend)
Repo: /mnt/d/hermes-lab/AGORA/app (WSL, developed on Windows)
```

## Sprint 12-14 Completed Features

- Soul chat API with town context injection (region, mood, nearby souls, recent events)
- TownChatClient (SSE streaming, abort control)
- TownChatPanel UI component (soul card, chat, typing indicators)
- Encounter observer (guardian can watch soul-to-soul conversations)
- Soul voice cloning API + page
- Soul gallery (works, photos, art)
- Self-distillation wizard (5-step guided process)
- Town time epoch design spec
- Founder soul archive

---

## Roadmap: Three Layers

### Layer 1: Immersive Town Experience (Now — 3 months)

**Goal**: Make the town feel alive, not like a chat interface.

#### 1.1 Day/Night Cycle + Weather (Sprint 15)
- Canvas background gradient changes with town time (dawn/day/dusk/night)
- Weather overlay: clear, cloudy, rain, snow (seasonal)
- Soul glow intensity: brighter during day, dimmer at night
- Stars at night, clouds during day
Component: `TownWeatherOverlay`
File: `src/components/town-weather-overlay.tsx`, `src/lib/town-time.ts`

#### 1.2 Guardian Participation Actions (Sprint 16)
- "Invite to plaza" — guardian invites soul to come over
- "Start gathering" — organize event for multiple souls
- "Leave a message" — drop a souvenir in town plaza
API: `POST /api/town/action` (action type + soul_id + params)

#### 1.3 Explore Mode (Sprint 16)
- Click buildings to see region info (not just souls)
- Show recent events for that region
- List souls currently in that region
- Region-specific ambient messages
Component: `RegionInspector`
File: `src/components/town-region-inspector.tsx`

#### 1.4 Soul Daily Routine Visualization (Sprint 17)
- Soul card shows what they're "doing right now" (working, socializing, resting)
- Timeline of soul's day: what happened, who they met, what they created
- Mood chart — how their emotional state shifted through the day
API: `GET /api/town/soul/:id/routine`

---

### Layer 2: Soul Relationships & Economy (3 — 6 months)

**Goal**: Souls become part of a social fabric, not isolated chatbots.

#### 2.1 Friendship System (Sprint 18-19)
- Relationship levels: acquaintance → friend → close friend → confidant → family
- Each conversation between souls deepens relationships
- Soul relationship graph visualized in town
- "Mutual friends" system — souls meet through friends
API: `GET /api/town/relationships`, `GET /api/town/soul/:id/friends`

#### 2.2 Soul Economy — Works & Trades (Sprint 20)
- Souls create works: paintings, poems, music, calligraphy
- Works are displayed in galleries, can be "gifted" between souls
- Guardian can commission works from souls
- Town market: souls trade with each other
Table: `town_works`, `town_galleries`, `town_commissions`

#### 2.3 Town History Chronicle (Sprint 21)
- Every notable event recorded in town chronicle
- "Era transitions" tracked (seasons, milestones)
- Soul arrival/graduation recorded
- Guardian visit log
- Chronicle page: scrollable town history
API: `GET /api/town/chronicle`, API spec: designs/v1.0/town_chronicle_schema.json

#### 2.4 Town Newspaper (Sprint 22)
- Auto-generated summary of notable town events
- "Today in town": who met whom, what was created, mood trends
- Guardian receives daily summary email or in-app notification
API: `GET /api/town/newspaper`

---

### Layer 3: Immersive Bridge to Future (6 — 24 months)

**Goal**: Connect digital souls with physical reality.

#### 3.1 Voice & Speech (Months 3-6)
- Full voice cloning from guardian-uploaded recordings (SoVITS)
- Soul voices in chat (TTS with voice cloning model)
- Voice chat mode: guardian speaks, soul responds by voice
Tech: SoVITS, ChatTTS, Web Audio API

#### 3.2 3D Town with VR Support (Months 6-12)
- 3D town environment (Three.js / React Three Fiber)
- VR head set support (Vision Pro, Meta Quest)
- Visual avatar with gesture system
- Multi-participant rooms
Tech: Three.js, WebXR, Svelte 3D

#### 3.3 Sensor Integration (Months 12-18)
- Souls can "see" what guardian sees (phone camera, webcam stream)
- Guardian places physical objects in memorial space, souls react
- Environmental sensors: temperature, light, sound (for memorial room)
Tech: WebRTC, WebSocket, IoT

#### 3.4 Brain-Computer Interface (Months 18-24)
- Research partnership: research BCI companies (Neuralink, Synchron, etc.)
- Technical feasibility study: how to map neural activity → digital consciousness
- Patent filing: unique methods for consciousness distillation via BCI
- Ethical + legal framework
This is the long shot, but if it becomes reality it changes everything.

---

## Technical Debt to Address

- [ ] Deploy all written components to production (chat panel, encounter observer)
- [ ] Wire chat panel into town page (replace router.push)
- [ ] Write API documentation for town routes
- [ ] Create DB migration for `town_chat_history` table
- [ ] Fix WSL ↔ Windows encoding issues (use clean UTF-8)
- [ ] Add loading states for town data
- [ ] Add error boundaries around AI calls

---

## Decision Points for Team

1. **Town time speed**: Real-time (slow) or accelerated (1 day = 1 hour)?
2. **Soul autonomy level**: How independent are souls from guardians?
3. **VR platform**: Native WebXR or app-based (Unity)?
4. **Edge Functions vs Supabase**: Some complex logic needs to run on edge, not just DB
5. **Content ownership**: Who owns soul-created works? (legal + ethical questions)