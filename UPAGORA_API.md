# UpAgora API Documentation

**Base URL:** `https://app-eof0fk7a5-majunjie-s-projects.vercel.app/api`
**Auth:** Bearer token via Supabase JWT (sent in `Authorization: Bearer <token>` header)
**Format:** JSON request/response, SSE for streaming endpoints

---

## Table of Contents

1. [Authentication](#authentication)
2. [Soul Distillation](#soul-distillation)
3. [Soul Chat](#soul-chat)
4. [Memory & RAG](#memory--rag)
5. [Guardian System](#guardian-system)
6. [Soul Economy](#soul-economy)
7. [Marketplace](#marketplace)
8. [Brain Engine](#brain-engine)
9. [Profile & Settings](#profile--settings)
10. [Social Feed](#social-feed)
11. [Voice & Multimedia](#voice--multimedia)
12. [Admin & Devtools](#admin--devtools)

---

## Authentication

### POST /auth/register
Register a new user account.
```json
// Request
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe",
  "username": "johndoe"
}

// Response
{
  "success": true,
  "user": { "id": "uuid", "email": "user@example.com", "name": "John Doe", "username": "johndoe" },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

### POST /auth/login
Authenticate with email/password.
```json
// Request
{ "email": "user@example.com", "password": "securepass123" }

// Response (same as register)
```

### POST /auth/logout
End current session.

### GET /auth/me
Get current authenticated user profile.
```json
// Response
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "username": "johndoe",
  "avatar_url": null,
  "created_at": "2026-01-01T00:00:00Z"
}
```

### POST /auth/forgot-password
Send password reset email.
```json
{ "email": "user@example.com" }
```

### POST /auth/reset-password
Reset password with token.
```json
{ "token": "...", "new_password": "..." }
```

---

## Soul Distillation

### POST /soul/quick-extract
Quick soul extraction from text input (minimum 20 chars). Best for onboarding flow.
```json
// Request
{
  "text": "My father was a Chinese poet who loved Su Dongpo...",
  "soul_type": "beloved",
  "context": "onboarding"
}

// Response
{
  "success": true,
  "soul_id": "uuid",
  "extraction": {
    "cognitive_pattern": "Reflective, metaphorical thinker...",
    "value_judgment": "Values wisdom, family bonds...",
    "expression_style": "Poetic, measured, warm...",
    "knowledge_structure": "Chinese literature, calligraphy...",
    "emotional_reaction": "Calm under pressure, deep empathy...",
    "relationship_memory": "Close family bonds, mentorship...",
    "life_narrative": "Born in Shanghai, became a teacher..."
  }
}
```

### POST /soul/extract
Full 7-dimension soul extraction with detailed analysis.
```json
// Request
{
  "source_texts": [
    { "type": "chat_log", "content": "..." },
    { "type": "writing", "content": "..." },
    { "type": "email", "content": "..." }
  ],
  "subject_name": "John Doe",
  "subject_description": "Optional background context"
}

// Response (same extraction object as quick-extract)
```

### POST /soul/regenerate-persona
Generate a persona.md file from extracted soul data.
```json
// Request
{ "soul_id": "uuid" }

// Response
{
  "success": true,
  "persona_md": "# John Doe - Soul Persona\n\n## Cognitive Pattern\n...\n## Value Judgment\n..."
}
```

### GET /soul/status
Get soul profile status overview.
```
Query: ?soul_id=uuid
```
```json
{
  "soul_id": "uuid",
  "name": "John Doe",
  "state": "active", // active | calibrating | draft
  "dimensions_extracted": 7,
  "memory_count": 42,
  "snapshot_count": 3,
  "calibration_count": 15,
  "created_at": "2026-01-01T00:00:00Z",
  "last_updated": "2026-05-26T00:00:00Z"
}
```

### POST /soul/snapshot
Create a versioned soul state snapshot.
```json
{ "soul_id": "uuid", "note": "Pre-calibration v3" }
```

### GET /soul/snapshot
List all snapshots for a soul.
```
Query: ?soul_id=uuid
```

### POST /soul/calibrate
Submit guardian calibration feedback.
```json
{
  "soul_id": "uuid",
  "guardian_name": "Jane Doe",
  "feedback": {
    "dimension": "expression_style",
    "rating": 4,
    "notes": "Should use shorter sentences, more direct tone"
  }
}
```

### POST /soul/import
Import raw source data for future extraction.
```json
{
  "soul_id": "uuid",
  "source_type": "chat_log",
  "content": "Raw text content...",
  "metadata": { "date": "2026-01-01", "source": "WeChat" }
}
```

### POST /soul/export
Export soul data as JSON.
```json
{ "soul_id": "uuid", "format": "json" }
```

### POST /soul/export-image
Export soul card as shareable image.
```json
{
  "soul_id": "uuid",
  "dimensions": [1.2, 0.8, 1.0, 0.9, 0.7, 1.1, 0.85]
}
// Returns: { "image_url": "/images/soul-card-uuid.png" }
```

### POST /soul/share
Create a public share link for soul card.
```json
{ "soul_id": "uuid" }
// Returns: { "slug": "abc123", "url": "/invite/abc123" }
```

---

## Soul Chat

### POST /soul/chat
Standard soul chat (non-streaming). Returns full response.
```json
// Request
{
  "soul_id": "uuid",
  "message": "What is your favorite poem?"
}

// Response
{
  "success": true,
  "response": "作为苏东坡，我最喜爱的诗当然是...",
  "emotion": "happy",
  "memory_references": ["memory_id_1", "memory_id_2"]
}
```

### POST /soul/chat-stream
**Streaming SSE soul chat** with emotion detection and memory injection.
```json
// Request (same as /soul/chat)

// SSE Events
data: {"type": "token", "content": "作为苏东坡..."}
data: {"type": "token", "content": "，我最..."}
data: {"type": "emotion", "emotion": "happy", "confidence": 0.85}
data: {"type": "memory", "memory_id": "uuid", "text": "Memory content..."}
data: {"type": "complete", "full_response": "...", "emotion": "happy"}
data: {"type": "close"}
```

### POST /soul/quick-chat
Lightweight chat without full persona loading.
```json
{ "prompt": "...", "context": "Optional conversation context" }
```

### POST /soul/compare
Compare two souls with radar chart data.
```json
// Request
{ "soul_id_a": "uuid", "soul_id_b": "uuid" }

// Response
{
  "dimensions": [
    { "name": "Cognitive Pattern", "value_a": 0.85, "value_b": 0.72 },
    { "name": "Value Judgment", "value_a": 0.90, "value_b": 0.65 },
    // ... all 7 dimensions
  ],
  "strengths_a": ["Cognitive Pattern", "Life Narrative"],
  "strengths_b": ["Emotional Reaction", "Expression Style"]
}
```

---

## Memory & RAG

### GET /soul/memory
List memories for a soul.
```
Query: ?soul_id=uuid&type=short_term&limit=20&offset=0
```
- `type`: `short_term` | `long_term` | `all`

```json
{
  "memories": [
    {
      "id": 123,
      "memory_content": "Father used to say that...",
      "memory_type": "long_term",
      "source": "extraction",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 42
}
```

### POST /soul/memory
Add a new memory entry.
```json
{
  "soul_id": "uuid",
  "memory_content": "Mother loved gardening on Sundays...",
  "memory_type": "long_term"
}
```

### DELETE /soul/memory
Delete a memory.
```json
{ "memory_id": 123 }
```

### POST /soul/memory-recall
**Semantic memory search** using vector embeddings.
```json
// Request
{
  "soul_id": "uuid",
  "query": "What did father say about poetry?",
  "top_k": 5,
  "min_similarity": 0.7
}

// Response
{
  "success": true,
  "results": [
    {
      "id": 456,
      "text_chunk": "Father recited Su Shi's poems at dinner...",
      "similarity": 0.89,
      "source_type": "memory",
      "metadata": { "memory_type": "long_term" }
    }
  ],
  "count": 3
}
```

### POST /soul/memory-recall/embed
Embed text chunks into vector store.
```json
{
  "user_id": "uuid",
  "soul_id": "uuid",
  "chunks": [
    { "text": "...", "source_type": "memory", "metadata": {} }
  ],
  "provider": "openai"
}
```

### POST /soul/memory-recall/reindex
Re-embed all existing memories for a soul.
```json
{ "soul_id": "uuid", "provider": "openai" }
```

---

## Guardian System

### POST /soul/guardian/verify-heart
Verify guardian identity with heart signature.
```json
{
  "soul_id": "uuid",
  "guardian_name": "Jane Doe",
  "relationship": "daughter",
  "commitment_text": "I promise to calibrate this soul faithfully..."
}

// Response
{ "verified": true, "badge": "warrior", "signature": "hex_string" }
```

### POST /soul/guardian/vote
Cast a calibration vote on soul response quality.
```json
{
  "soul_id": "uuid",
  "message_id": "uuid",
  "vote": "up", // up | down | neutral
  "reason": "This doesn't sound like how father would respond"
}

// Response
{ "vote_recorded": true, "new_score": 4.2, "total_votes": 15 }
```

### POST /soul/guardian/sig
Generate guardian signature for soul version attestation.
```json
{ "soul_id": "uuid", "snapshot_id": "uuid" }

// Response
{ "signature": "0x...", "attested_at": "2026-05-26T00:00:00Z" }
```

### POST /soul/guardian-calibrate
Guardian-led calibration session.
```json
{
  "soul_id": "uuid",
  "guardian_id": "uuid",
  "dimension": "expression_style",
  "adjustments": {
    "tone": "more_casual",
    "pace": "faster",
    "vocabulary": "simpler"
  },
  "notes": "Make the soul sound less formal in daily chats"
}
```

---

## Soul Economy

### GET /soul/economy
Get soul economy wallet overview.
```json
{
  "credits": 1250,
  "badges": [
    { "id": "warrior", "name": "Guardian Warrior", "earned_at": "2026-05-26T00:00:00Z" },
    { "id": "scholar", "name": "Knowledge Keeper", "earned_at": "2026-05-25T00:00:00Z" }
  ],
  "rank": "Gold",
  "rank_score": 890
}
```

### GET /soul/economy/badges
List available badges and earned status.

### POST /soul/economy/trade
Trade credits for soul access or features.
```json
{
  "type": "purchase_soul_access",
  "target_soul_id": "uuid",
  "amount": 100,
  "listing_id": "uuid"
}
```

---

## Marketplace

### GET /soul/marketplace
List souls available in marketplace.
```
Query: ?category=all&sort=trending&search=&page=1&limit=20
```
- `category`: `all` | `beloved` | `mentor` | `expert`
- `sort`: `trending` | `newest` | `highest_rated` | `price_low` | `price_high`

```json
{
  "listings": [
    {
      "id": "uuid",
      "soul_name": "Socrates",
      "soul_preview": "Ancient Greek philosopher known for...",
      "owner": "philosopher_user",
      "price": 50,
      "rating": 4.8,
      "review_count": 127,
      "reputation_tier": "Gold",
      "category": "mentor",
      "created_at": "2026-05-20T00:00:00Z"
    }
  ],
  "total": 45,
  "page": 1
}
```

### POST /soul/marketplace
Create a new marketplace listing.
```json
{
  "soul_id": "uuid",
  "price": 50,
  "category": "mentor",
  "description": "Chat with Socrates about philosophy...",
  "access_type": "limited" // limited | unlimited
}
```

### POST /soul/marketplace/:id/purchase
Purchase access to a soul.
```json
{ "listing_id": "uuid" }
```

### GET /soul/marketplace/:id/reviews
List reviews for a marketplace listing.
```
Query: ?limit=10&offset=0
```

---

## Brain Engine

### GET /soul/brain
Get soul brain status.
```
Query: ?soul_id=uuid
```
```json
{
  "status": "active",
  "last_thought": "Reflecting on user's question about poetry...",
  "thought_count": 342,
  "processing": false
}
```

### POST /soul/brain
Trigger brain think/act cycle.
```json
{
  "soul_id": "uuid",
  "action": "think", // think | act | reflect
  "context": "Optional external stimulus"
}

// SSE Response
data: {"type": "thought", "content": "I wonder if the user means...", "confidence": 0.7}
data: {"type": "action", "content": "Checking memory for relevant poetry references...", "action": "memory_recall"}
data: {"type": "complete"}
```

### GET /brain/feed
Get recent brain activity feed (public).

### GET /brain/status
Get system-wide brain engine status.

### POST /brain/report
Generate a brain activity report.
```json
{ "soul_id": "uuid", "period": "24h" } // 24h | 7d | 30d
```

---

## Profile & Settings

### GET /settings/profile:Get current user profile settings.

### PUT /settings/profile
Update user profile.
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "bio": "Soul distiller and guardian"
}
```

### POST /settings/avatar
Upload/update profile avatar.
```
Content-Type: multipart/form-data
Fields: avatar (image file, max 5MB)
```

### GET /settings/badges
Get user's earned badges.

### GET /settings/model
Get current AI model settings.

### PUT /settings/model
Change AI model provider.
```json
{
  "provider": "deepseek", // deepseek | openrouter | anthropic | openai
  "model": "deepseek-chat"
}
```

### GET /reputation/my
Get user reputation score and details.

### GET /reputation/ranking
Get reputation leaderboard.
```
Query: ?limit=50&timeframe=monthly // monthly | all_time
```

---

## Social Feed

### GET /posts
List feed posts.
```
Query: ?type=all&limit=20&offset=0
```
- `type`: `all` | `following` | `trending` | `my`

```json
{
  "posts": [
    {
      "id": "uuid",
      "author": { "username": "johndoe", "name": "John Doe", "avatar_url": null },
      "content": "Just distilled my grandfather's soul...",
      "soul_reference": "uuid",
      "likes": 42,
      "comments_count": 8,
      "created_at": "2026-05-26T00:00:00Z"
    }
  ],
  "total": 156
}
```

### POST /posts
Create a new post.
```json
{
  "content": "Just distilled my grandfather's soul...",
  "soul_reference": "uuid",
  "visibility": "public" // public | followers | private
}
```

### POST /posts/:id/like
Like/unlike a post.
```json
/* Toggle: POST again to unlike */
```

### GET /posts/:id/comments
List comments for a post.

### POST /posts/:id/comments
Add a comment.
```json
{ "content": "Beautiful tribute!" }
```

### GET /search
Search souls, posts, users.
```
Query: ?q=socrates&type=all // souls | posts | users | all
```

---

## Notifications

### GET /notifications
Get user notifications.
```
Query: ?unread=true&limit=20
```
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "comment", // comment | like | guardian_vote | marketplace_sale
      "title": "New comment on your post",
      "message": "Jane Doe commented: Beautiful tribute!",
      "actor": { "username": "janedoe" },
      "target_id": "post_uuid",
      "read": false,
      "created_at": "2026-05-26T00:00:00Z"
    }
  ]
}
```

### POST /notifications
Mark notifications as read.
```json
{ "notification_ids": ["uuid1", "uuid2"] }
```

### POST /notifications/dispatch
Manually trigger notification dispatch (admin).

---

## Voice & Multimedia

### POST /voice/clone
Submit voice samples for cloning.
```
Content-Type: multipart/form-data
Fields:
- audio_file (WAV/MP3, min 30s, max 5min)
- sample_count (integer, min 3)
```
```json
// Response
{
  "job_id": "uuid",
  "status": "processing",
  "estimated_time": "5-10 minutes"
}
```

### GET /voice/clone
Check voice cloning job status.
```
Query: ?job_id=uuid
```

---

## Admin & Devtools

### GET /admin/health
System health check.
```json
{
  "status": "healthy",
  "uptime": "72h",
  "db_connection": "ok",
  "supabase_status": "connected",
  "llm_providers": {
    "deepseek": "connected",
    "openrouter": "connected",
    "openai": "connected"
  },
  "active_souls": 128,
  "active_users": 45
}
```

### GET /admin/stats
Platform statistics.
```json
{
  "total_users": 1250,
  "total_souls": 890,
  "total_chats": 45000,
  "total_memories": 234000,
  "total_marketplace_sales": 567,
  "daily_active_users": 180,
  "avg_soul_rating": 4.6
}
```

### GET /devtools/soul-inspect
Debug inspection of a soul's internal state.
```
Query: ?soul_id=uuid
```
```json
{
  "persona_md_preview": "First 500 chars of persona...",
  "memory_sample": ["Memory 1...", "Memory 2..."],
  "embedding_count": 42,
  "snapshot_history": [
    { "id": 1, "note": "Initial extraction", "created_at": "..." },
    { "id": 2, "note": "Post-calibration v2", "created_at": "..." }
  ],
  "guardian_signatures": ["0x123...", "0x456..."]
}
```

---

## Wallet & Economy

### GET /wallet
Get wallet balance and details.

### GET /wallet/transactions
Get transaction history.
```
Query: ?type=all&limit=20 // credits_earned | credits_spent | purchase | sale
```

### POST /wallet/spend
Spend credits on a feature or listing.
```json
{ "listing_id": "uuid", "amount": 50 }
```

---

## Error Responses

All endpoints return standard error format on failure:

400 Bad Request:
```json
{ "error": "Invalid request: field 'soul_id' is required" }
```

401 Unauthorized:
```json
{ "error": "Authentication required. Please log in." }
```

403 Forbidden:
```json
{ "error": "You don't have permission to access this resource." }
```

404 Not Found:
```json
{ "error": "Resource not found." }
```

429 Too Many Requests:
```json
{ "error": "Rate limit exceeded. Try again in 60 seconds." }
```

500 Internal Server Error:
```json
{ "error": "An unexpected error occurred. Please try again later." }
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /soul/chat, /soul/chat-stream | 60 requests/minute |
| /soul/extract, /soul/quick-extract | 10 requests/minute |
| /auth/* | 5 requests/minute |
| /soul/marketplace/purchase | 5 requests/hour |
| /voice/clone | 3 requests/hour |
| General API | 120 requests/minute |

---

## WebSocket Events

Real-time events via `/api/notifications/dispatch`:

```javascript
// Frontend subscription example
const ws = new WebSocket(`wss://${window.location.host}/api/notifications`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: 'notification' | 'chat_stream' | 'brain_update'
  // data.payload: event-specific data
};
```
