#!/usr/bin/env node
/**
 * 灵魂日常循环定时任务
 * 每小时运行一次，唤醒灵魂、让灵魂思考、记录活动
 * 
 * 运行方式:
 * node scripts/soul-daily-cycle.js
 * 
 * 或用 cron job:
 * 用 cron job:
 * import(path.resolve(__dirname, '../scripts/soul-daily-cycle.js'));
 * 
 * 或者通过 crontab:
 * 0 * * * * cd /mnt/d/hermes-lab/AGORA/app && node scripts/soul-daily-cycle.js
 */

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSoulSessions() {
  try {
    const response = await fetch(`${baseURL}/api/soul/sessions`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || ''}`,
      },
    });

    if (!response.ok) {
      console.error(`[soul-cron] Failed to fetch sessions: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('[soul-daily-cycle] Error fetching sessions:', error);
    return [];
  }
}

async function wakeUpSoul(sessionId: string) {
  try {
    const response = await fetch(`${baseURL}/api/soul/brain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      console.error(`[soul-cron] Failed to wake up soul ${sessionId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[soul-cron] Error waking up soul ${sessionId}:`, error);
    return null;
  }
}

async function mineForSouls() {
  const sessions = await getSoulSessions();
  let mined = 0;

  for (const session of sessions) {
    try {
      const response = await fetch(`${baseURL}/api/soul/economy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          type: 'mine',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.mined_agu) {
          console.log(`[soul-cron] ${session.subject_name} mined ${data.result.mined_agu} AGU`);
          mined++;
        }
      }
    } catch (error) {
      console.error(`[soul-cron] Error mining for ${session.subject_name}:`, error);
    }

    // Rate limiting
    await sleep(1000);
  }

  console.log(`[soul-cron] Mining complete for ${mined}/${sessions.length} souls`);
}

async function dailyCycle() {
  console.log('[soul-cron] Starting daily cycle...');
  const start = Date.now();

  // Step 1: Wake up all souls
  console.log('[soul-cron] Phase 1: Waking up souls...');
  const sessions = await getSoulSessions();
  console.log(`[soul-cron] Found ${sessions.length} soul sessions`);

  let awakened = 0;
  for (const session of sessions) {
    const result = await wakeUpSoul(session.id);
    if (result && result.success) {
      console.log(`[soul-cron] ${session.subject_name} woke up: ${result.decision?.activity}`);
      awakened++;
    }

    // Rate limiting
    await sleep(2000);
  }

  console.log(`[soul-cron] Woke up ${awakened}/${sessions.length} souls`);

  // Step 2: Mining
  console.log('[soul-cron] Phase 2: Mining AGU...');
  await mineForSouls();

  const elapsed = Date.now() - start;
  console.log(`[soul-cron] Daily cycle complete in ${elapsed}ms`);

  // Step 3: Log the cycle
  console.log('[soul-cron] Cycle complete. Next run in ~1 hour.');
}

// Run if called directly
if (require.main === module) {
  dailyCycle().catch(console.error);
}
