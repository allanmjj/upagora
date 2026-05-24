import { createClient } from '@/lib/supabase/server';

// ----- Mining -----
export async function soulMine(sessionId: string) {
  const supabase = createClient();
  const now = new Date();

  let { data: wallet } = await supabase
    .from('soul_wallets')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (!wallet) {
    const { data: newWallet } = await supabase
      .from('soul_wallets')
      .insert({ session_id: sessionId, agu_balance: 0, agu_lifetime_earned: 0, agu_lifetime_spent: 0 })
      .select().single();
    wallet = newWallet;
  }

  const streak = wallet.mine_streak || 0;
  const reward = 10 + streak * 2 + Math.floor(Math.random() * 6);

  const { data: updatedWallet } = await supabase
    .from('soul_wallets')
    .update({
      agu_balance: wallet.agu_balance + reward,
      agu_lifetime_earned: wallet.agu_lifetime_earned + reward,
      mine_streak: streak + 1,
      last_mine_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('session_id', sessionId)
    .select().single();

  await supabase.from('soul_transactions').insert({
    from_session_id: null,
    to_session_id: sessionId,
    amount_agu: reward,
    transaction_type: 'mine',
    description: `Mined ${reward} AGU (streak ${streak + 1})`,
    created_at: now.toISOString(),
  });

  return { reward, wallet: updatedWallet };
}

// ----- Buy House -----
export async function buyHouse(sessionId: string, houseId: string) {
  const supabase = createClient();
  const now = new Date();

  const { data: house } = await supabase
    .from('soul_households')
    .select('*')
    .eq('id', houseId).single();
  if (!house) throw new Error('House not found');

  const { data: wallet } = await supabase
    .from('soul_wallets')
    .select('agu_balance, agu_lifetime_spent').eq('session_id', sessionId).single();
  if (!wallet || wallet.agu_balance < house.sale_price_agu) {
    throw new Error('Insufficient AGU');
  }

  await supabase.from('soul_households').update({
    session_id: sessionId, is_for_sale: false, sale_price_agu: null, updated_at: now.toISOString(),
  }).eq('id', houseId);

  await supabase.from('soul_wallets').update({
    agu_balance: wallet.agu_balance - house.sale_price_agu,
    agu_lifetime_spent: wallet.agu_lifetime_spent + house.sale_price_agu,
    updated_at: now.toISOString(),
  }).eq('session_id', sessionId);

  await supabase.from('soul_transactions').insert({
    from_session_id: sessionId, to_session_id: null, amount_agu: house.sale_price_agu,
    transaction_type: 'property_buy', description: `Bought ${house.house_name}`, created_at: now.toISOString(),
  });

  return { success: true };
}

// ----- Sell House -----
export async function sellHouse(sessionId: string, houseId: string, price: number) {
  const supabase = createClient();
  await supabase.from('soul_households').update({
    is_for_sale: true, sale_price_agu: price, sale_listed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', houseId).eq('session_id', sessionId);
  return { success: true, price };
}
