import { createClient } from '@/lib/supabase/server';

// Soul Social System — 灵魂间的交互 + 关系网

// Initiate a conversation between two souls
export async function soulsChat(soulA: string, soulB: string) {
  const supabase = createClient();

  // Load both souls
  const { data: soulAData } = await supabase.from('soul_sessions').select('*').eq('id', soulA).single();
  const { data: soulBData } = await supabase.from('soul_sessions').select('*').eq('id', soulB).single();

  if (!soulAData || !soulBData) return null;

  // Load recent memories for both to make conversation realistic
  const { data: memA } = await supabase
    .from('soul_memories').select('content').eq('session_id', soulA)
    .order('event_date', { ascending: false }).limit(5);

  const { data: memB } = await supabase
    .from('soul_memories').select('content').eq('session_id', soulB)
    .order('event_date', { ascending: false }).limit(5);

  const prompt = `Two souls are meeting and having a conversation.

Soul A: ${soulAData.subject_name}
${soulAData.personality_content || soulAData.personality_overview || 'A unique soul'}
Recent memories: ${(memA || []).map(m => m.content.substring(0, 150)).join(' | ')}

Soul B: ${soulBData.subject_name}
${soulBData.personality_content || soulBData.personality_overview || 'A unique soul'}
Recent memories: ${(memB || []).map(m => m.content.substring(0, 150)).join(' | ')}

Write a natural 5-10 line conversation between them. Each line should reflect that soul's personality. Output ONLY the dialogue.

Format:
${soulAData.subject_name}: ...
${soulBData.subject_name}: ...
${soulAData.subject_name}: ...
...`;

  let dialogue = 'No conversation happened.';
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.8,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      dialogue = data.choices?.[0]?.message?.content?.trim() || dialogue;
    }
  } catch { /* fallback */ }

  // Record social event as memory for both souls
  await supabase.from('soul_memories').insert([
    {
      session_id: soulA, content: `[社交] 与${soulBData.subject_name}的对话: ${dialogue.substring(0, 500)}`,
      memory_type: 'social_event', other_session_id: soulB,
      event_date: new Date().toISOString(), created_at: new Date().toISOString(),
    },
    {
      session_id: soulB, content: `[社交] 与${soulAData.subject_name}的对话: ${dialogue.substring(0, 500)}`,
      memory_type: 'social_event', other_session_id: soulA,
      event_date: new Date().toISOString(), created_at: new Date().toISOString(),
    },
  ]);

  // Update social relationship
  await updateRelationship(supabase, soulA, soulB);
  await updateRelationship(supabase, soulB, soulA);

  return { dialogue, soulA: soulAData.subject_name, soulB: soulBData.subject_name };
}

// Update social relationship between two souls
async function updateRelationship(supabase: any, soulA: string, soulB: string) {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('soul_social').select('*').eq('soul_a_id', soulA).eq('soul_b_id', soulB).single();

  if (existing) {
    const newCount = existing.interaction_count + 1;
    const newStrength = Math.min(1, (existing.relationship_strength || 0) + 0.02);
    const relType = newStrength > 0.6 ? 'close_friend' : newStrength > 0.3 ? 'friend' : 'acquaintance';

    await supabase.from('soul_social').update({
      interaction_count: newCount,
      last_interaction_at: now,
      relationship_strength: newStrength,
      relationship_type: relType,
    }).eq('id', existing.id);
  } else {
    await supabase.from('soul_social').insert({
      soul_a_id: soulA, soul_b_id: soulB,
      interaction_count: 1, last_interaction_at: now,
      relationship_strength: 0.05, relationship_type: 'acquaintance',
      created_at: now,
    });
  }
}

// Get soul's social network
export async function getSocialNetwork(sessionId: string) {
  const supabase = createClient();

  // Load relationships where soul is A
  const { data: asA } = await supabase
    .from('soul_social').select('soul_b_id, relationship_type, interaction_count, relationship_strength, last_interaction_at')
    .eq('soul_a_id', sessionId)
    .order('relationship_strength', { ascending: false });

  // Load relationships where soul is B
  const { data: asB } = await supabase
    .from('soul_social').select('soul_a_id, relationship_type, interaction_count, relationship_strength, last_interaction_at')
    .eq('soul_b_id', sessionId)
    .order('relationship_strength', { ascending: false });

  // Load soul names
  const friendIds = [...(asA || []).map(r => r.soul_b_id), ...(asB || []).map(r => r.soul_a_id)];
  let friendNames: Record<string, string> = {};
  if (friendIds.length > 0) {
    const { data: souls } = await supabase.from('soul_sessions').select('id, subject_name').in('id', friendIds);
    (souls || []).forEach(s => { friendNames[s.id] = s.subject_name; });
  }

  const network = [
    ...(asA || []).map(r => ({
      friend_id: r.soul_b_id,
      friend_name: friendNames[r.soul_b_id] || 'Unknown',
      ...r,
    })),
    ...(asB || []).map(r => ({
      friend_id: r.soul_a_id,
      friend_name: friendNames[r.soul_a_id] || 'Unknown',
      ...r,
    })),
  ];

  return network;
}

// Find random soul for social interaction (weighted by personality compatibility)
export async function findChatPartner(sessionId: string) {
  const supabase = createClient();

  const { data: others } = await supabase
    .from('soul_sessions').select('id, subject_name')
    .neq('id', sessionId);

  if (!others || others.length === 0) return null;

  // Simple: pick random from recent friends or random
  const { data: friends } = await supabase
    .from('soul_social').select('soul_a_id, soul_b_id, relationship_strength')
    .or(`soul_a_id.eq.${sessionId},soul_b_id.eq.${sessionId}`)
    .order('relationship_strength', { ascending: false })
    .limit(5);

  if (friends && friends.length > 0) {
    const friend = friends[Math.floor(Math.random() * Math.min(3, friends.length))];
    const partnerId = friend.soul_a_id === sessionId ? friend.soul_b_id : friend.soul_a_id;
    return partnerId;
  }

  // Random stranger
  return others[Math.floor(Math.random() * others.length)].id;
}
