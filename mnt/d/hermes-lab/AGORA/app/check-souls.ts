import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dfqeafreiwpyrzcdvegm.supabase.co',
  'sb_secret_SzuhJmoUKtBm49LPNuunGw_70y5cqqD'
);

async function main() {
  const { data: souls, count } = await supabase
    .from('town_souls')
    .select('id, name, name_native, category, status, created_at')
    .order('created_at', { ascending: true });

  console.log('=== Soul Gallery Current State ===\n');
  console.log('Total souls:', count);
  console.log('');

  if (souls && souls.length > 0) {
    souls.forEach(s => {
      const name = s.name_native || s.name || '?';
      const cat = s.category || 'general';
      const status = s.status || 'active';
      const idShort = s.id.slice(0, 8) + '...';
      console.log(`  [${cat.padEnd(12)}] ${name.padEnd(20)}  status=${status}  id=${idShort}`);
    });
  } else {
    console.log('  (no souls found)');
  }

  console.log('\n=== Preset Souls Expected ===\n');
  const presets = [
    ['d557cffa', 'Su Shi / \u82cf\u8f7f'],
    ['2b3a70a0', 'Confucius / \u5b54\u5b50'],
    ['c011bd3a', 'Li Bai / \u674e\u767d'],
    ['bdd4caa4', 'Marie Curie / \u5c45\u91cc\u5982\u4eba'],
    ['d3d7f08f', 'Leonardo da Vinci / \u8fbe\u74e6\u514b'],
    ['shakespear', 'Shakespeare / \u6c83\u5229\u59c6\u00b7\u4f2f\u7279\u00b7\u4f2f\u7279'],
    ['lincoln', 'Lincoln / \u4e3d\u594b'],
    ['laozi', 'Laozi / \u8001\u5b50'],
  ];
  presets.forEach(([id, name]) => console.log(`  ${id.padEnd(10)} ${name}`));
}

main().catch(console.error);
