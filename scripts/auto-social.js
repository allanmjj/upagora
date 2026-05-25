#!/usr/bin/env node
/**
 * 自动社交定时任务
 * 每 2 小时运行一次���让灵魂之间随机聊天���产生���关系���
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSoulSessions() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[auto-social] Missing Supabase env vars');
    return [];
  }

  const resp = await fetch(`${supabaseUrl}/rest/v1/soul_sessions?select=id,subject_name`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    console.error(`[auto-social] Failed to fetch sessions: ${resp.status}`);
    return [];
  }

  return resp.json();
}

async function triggerSoulSocial(soulA, soulB) {
  const resp = await fetch(`${BASE_URL}/api/soul/social/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soul_a: soulA, soul_b: soulB }),
  });

  if (resp.ok) {
    const data = await resp.json();
    console.log(`[auto-social] ${data.soulA} ↔ ${data.soulB}: ${data.dialogue?.substring(0, 100)}...`);
    return data;
  }

  return null;
}

async function runAutoSocial() {
  console.log('[auto-social] Starting social cycle...');
  const start = Date.now();

  const sessions = await getSoulSessions();
  console.log(`[auto-social] Found ${sessions.length} souls`);

  if (sessions.length < 2) {
    console.log('[auto-social] Need at least 2 souls to socialize');
    return;
  }

  // Pick random pairs���max 5 pairs per cycle���
  const pairs = [];
  const used = new Set();

  for (let i = 0; i < Math.min(5, sessions.length); i++) {
    let idx = Math.floor(Math.random() * sessions.length);
    while (used.has(idx)) {
      idx = Math.floor(Math.random() * sessions.length);
    }
    used.add(idx);

    let partnerIdx = Math.floor(Math.random() * sessions.length);
    while (used.has(partnerIdx) || partnerIdx === idx) {
      partnerIdx = Math.floor(Math.random() * sessions.length);
    }
    // Don't block partner���last pair���no repeat���
    if (sessions.length - used.size < 2) break;

    pairs.push([sessions[idx].id, sessions[partnerIdx].id]);
  }

  console.log(`[auto-social] Triggering ${pairs.length} conversations...`);

  for (const [soulA, soulB] of pairs) {
    await triggerSoulSocial(soulA, soulB);
    await sleep(3000); // Rate limiting
  }

  const elapsed = Date.now() - start;
  console.log(`[auto-social] Cycle complete in ${elapsed}ms`);
}

// Run if called directly
if (require.main === module) {
  runAutoSocial().catch(console.error);
}
