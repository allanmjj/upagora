# UpAgora Product Upgrade Strategy

Generated: 2026-05-24

---

## Core Philosophy: "Souls should keep living, not be archived"

Current UpAgora is a working tool: upload text -> extract -> chat.
Human desire: "I want my grandma/grandpa to still be able to talk to me."

All features should stem from "humans want to live on."

---

## Phase 1: Ease of Use - Zero-friction entry

### 1.1 One-sentence soul (HIGHEST PRIORITY)

Current flow: upload file -> fill form -> wait extraction -> generate -> chat (5 steps)

Upgrade: type "My grandma loved making braised pork, loved singing Yu opera, loud voice but soft-hearted" -> instantly generate soul draft -> immediately chat

Implementation: client calls /api/soul/quick-extract (existing), add minimal frontend entry

### 1.2 Voice conversation distillation

No typing, no forms. Speak into phone: "Tell me about your dad/mom/grandpa"

AI guides with questions: "What was their attitude toward hardship?" "What did they say most often?"

User speaks, auto STT to text, backend starts distillation

Implementation: Web Speech API (STT) - fully client-side, no extra server cost

### 1.3 Zero-registration experience

Anonymous ID starts distillation immediately. Experience full flow first, then prompt registration to save.

Current schema supports anonymous (session_slug). Frontend needs to open this path.

---

## Phase 2: Love to Use - Souls should be "alive"

### 2.1 Soul voice (EMOTIONAL ANCHOR, biggest breakthrough)

Upload a recording of the loved one (30s-1min), clone the voice.

Future soul chats speak in this voice.

Web Speech API for basic TTS, voice cloning via backend API (small audio clip).

This is the "WOW" moment: come home, open the page, hear grandma's voice talking to you.

### 2.2 Soul reaches out to you

On birthdays, anniversaries, memorial days, system pushes a message:
"Your grandpa's birthday is today, want to chat with him?"

Implementation: cron job + PWA notification

### 2.3 Soul grows and changes

Soul is not static - it evolves through continuous interaction.

Each guardian calibration makes it more accurate.
"Your soul has been refined 12 times, getting closer." - progress + achievement

Implementation: calibration + snapshot tables exist, add frontend visualization

### 2.4 Soul Cards (social sharing engine)

Each soul auto-renders a beautiful shareable card: avatar, name, signature quote, 7-dimension radar chart.

Export as image, share to WeChat moments/groups.

Card links to soul preview page.

Implementation: client-side Canvas/SVG, /api/soul/export-image exists

---

## Phase 3: Valuable - More than curiosity

### 3.1 Wisdom Q&A scenarios

Not just casual chat - targeted "consultation":
- "I'm stuck in my career, what do you think I should do?"
- "Help me write a birthday message for my grandchild"

Soul answers using the distilled person's thinking style and expression.

Value: turning a deceased person's wisdom into a "usable tool."

### 3.2 Family memory library

A family can distill multiple souls: grandpa, grandma, dad.

Family members can "visit" each other's distilled souls.

Family tree visualization: each family node connected to a living soul.

Implementation: add family_groups table, D3.js tree visualization

### 3.3 Quick scenario entries

"Help me write a will" is too heavy. Replace with guided entry points:
- "Write a letter to my future self"
- "Record some life experience for descendants"
- "Keep this person alive"

Lower emotional resistance, let users start small.

---

## Phase 4: Innovative - Create surprise

### 4.1 Soul vs Soul

Two souls can "converse" - pick grandpa and grandma's souls to discuss a topic.

"Which major should I choose?" - grandpa soul and grandma soul give different perspectives.

Extremely strong experience, high sharing value.

### 4.2 Soul growth timeline

Timeline visualization: from "one-sentence soul" to "complete soul."

Each distillation/calibration/chat leaves a point on the timeline.

Users can review: "May 1st - distilled expression style, June 1st - added life narrative"

Implementation: client-side D3.js / Framer Motion animation

### 4.3 Guided distillation experience (CORE INNOVATION)

Not "upload a picture of the person" but "AI journalist interviews you."

AI asks with warm curiosity: "Tell me about that person. What was it like when you first met?"

User speaks, recorded as distillation material.

User feels like talking to a friend, not entering data.

### 4.4 Soul habitat

A soul should have a permanent digital space, not just chat logs.

A visual "room" showing the digital avatar, memory library, calibration records.

Opening the app each day feels like "visiting" someone, not entering an application.

Implementation: client-side Three.js or 2D Canvas scene, data from existing APIs

---

## Feasibility Matrix

| Feature | Implementation | Feasibility | Cost |
|---------|---------------|-------------|------|
| One-sentence soul | Frontend + quick-extract API | High | Low |
| Voice distillation | Web Speech STT + distillation API | High | Low |
| Soul voice | Web Speech TTS / backend clone | Medium | Medium |
| Soul cards | Canvas drawing + export-image API | High | Low |
| Growth timeline | D3.js / Framer Motion | High | Low |
| Soul vs Soul | Chat API x2 + orchestration | Medium | Low |
| Family tree | D3.js tree + new table | Medium | Medium |
| Soul habitat | Canvas/Three.js scene | Medium | Medium |
| Scheduled reminders | Cron job + PWA notification | Medium | Low |
| Multi-guardian | Existing share link + calibration | High | Low |

---

## Execution Order

**Sprint 1:** One-sentence soul + Soul voice - fastest impact, highest emotional value

**Sprint 2:** Soul cards + Growth timeline - social sharing + retention

**Sprint 3:** Soul habitat + Guided distillation - core experience upgrade

**Sprint 4:** Family tree + Soul vs Soul - differentiation and innovation

All features work within the existing architecture. No major schema changes needed.
Frontend work is the bulk - most can be done client-side.
