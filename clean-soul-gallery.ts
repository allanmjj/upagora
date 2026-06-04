import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfqeafreiwpyrzcdvegm.supabase.co',
  'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'
);

async function cleanup() {
  // 1. List town_souls before cleanup
  const { data: souls, count: soulCount } = await supabase
    .from('town_souls')
    .select('*', { count: 'exact', head: true });
  console.log(`town_souls: ${soulCount} rows`);

  // 2. List soul_gallery before cleanup
  const { data: gallery, count: galleryCount } = await supabase
    .from('soul_gallery')
    .select('*', { count: 'exact', head: true });
  console.log(`soul_gallery: ${galleryCount} rows`);

  // 3. Keep only preset souls in town_souls
  const presetIds = new Set([
    'd557cffa-6d90-436a-9918-eb28c797e5a1', // 苏轼
    '2b3a70a0-239e-4dfc-8c08-502aca779a72', // 孔子
    'c011bd3a-f6d1-4c26-b378-1c41fb421878', // 李白
    'bdd4caa4-ca32-4c14-8186-fbea5584a429', // 居里夫人
    'd3d7f08f-6b5a-44f9-9733-5055b48743df', // 达芬奇
    'shakespeare-001',
    'lincoln-001',
    'laozi-001',
    'guest-laozi',
    'guest-shakespeare',
    'guest-lincoln',
    'preset-su-shi',
    'preset-confucius',
    'preset-li-bai',
    'preset-curie',
    'preset-leonardo',
  ]);

  // Get all town_souls to find non-preset ones
  const { data: allSouls } = await supabase
    .from('town_souls')
    .select('id, name');

  if (allSouls) {
    const toDelete = allSouls.filter(s => !presetIds.has(s.id));
    console.log(`\nDeleting ${toDelete.length} non-preset souls from town_souls:`);
    for (const s of toDelete) {
      console.log(`  - ${s.id}: ${s.name}`);
    }

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(s => s.id);
      const { error } = await supabase
        .from('town_souls')
        .delete()
        .in('id', idsToDelete);
      
      if (error) {
        console.error('Error deleting town_souls:', error);
      } else {
        console.log(`Deleted ${toDelete.length} rows from town_souls`);
      }
    }
  }

  // 4. Delete all non-preset rows from soul_gallery
  const { data: allGallery } = await supabase
    .from('soul_gallery')
    .select('id, soul_id, title');

  if (allGallery && allGallery.length > 0) {
    const galleryToDelete = allGallery.filter(g => !presetIds.has(g.id) && !presetIds.has(g.soul_id));
    console.log(`\nDeleting ${galleryToDelete.length} non-preset entries from soul_gallery:`);
    for (const g of galleryToDelete) {
      console.log(`  - ${g.id}: ${g.title || g.soul_id}`);
    }

    if (galleryToDelete.length > 0) {
      const gIds = galleryToDelete.map(g => g.id);
      const { error } = await supabase
        .from('soul_gallery')
        .delete()
        .in('id', gIds);
      
      if (error) {
        console.error('Error deleting soul_gallery:', error);
      } else {
        console.log(`Deleted ${galleryToDelete.length} rows from soul_gallery`);
      }
    }
  }

  // 5. Check soul_messages and soul_sessions
  const { count: msgCount } = await supabase
    .from('soul_messages')
    .select('*', { count: 'exact', head: true });
  console.log(`\nsoul_messages: ${msgCount} rows`);

  const { count: sessCount } = await supabase
    .from('soul_sessions')
    .select('*', { count: 'exact', head: true });
  console.log(`soul_sessions: ${sessCount} rows`);

  // Delete messages/sessions for deleted souls
  if (allSouls) {
    const deletedIds = allSouls.filter(s => !presetIds.has(s.id)).map(s => s.id);
    if (deletedIds.length > 0) {
      const { error: err1 } = await supabase
        .from('soul_messages')
        .delete()
        .in('soul_id', deletedIds);
      if (err1) console.error('Error deleting soul_messages:', err1);
      else console.log(`Cleaned up soul_messages for deleted souls`);

      const { error: err2 } = await supabase
        .from('soul_sessions')
        .delete()
        .in('soul_id', deletedIds);
      if (err2) console.error('Error deleting soul_sessions:', err2);
      else console.log(`Cleaned up soul_sessions for deleted souls`);
    }
  }

  console.log('\nCleanup complete!');
}

cleanup().catch(console.error);
