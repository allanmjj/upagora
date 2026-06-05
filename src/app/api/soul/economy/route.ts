import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { session_id, type } = body;

  if (!session_id || !type) {
    return NextResponse.json({ error: 'session_id and type required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Load wallet
    const { data: wallet, error: walletError } = await supabase
      .from('soul_wallets')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (walletError && walletError.code !== 'PGRMRSROWNOTFOUND') {
      throw walletError;
    }

    let result: any = {};

    switch (type) {
      case 'mine': {
        const reward = await mineAGU(supabase, session_id, wallet);
        result = reward;
        break;
      }
      case 'buy_property': {
        const { plot_id } = body;
        if (!plot_id) {
          return NextResponse.json({ error: 'plot_id required' }, { status: 400 });
        }
        const purchase = await buyProperty(supabase, session_id, plot_id, wallet);
        result = purchase;
        break;
      }
      case 'sell_property': {
        const { household_id } = body;
        const sale = await sellProperty(supabase, session_id, household_id);
        result = sale;
        break;
      }
      case 'exchange_points': {
        const { points_to_exchange } = body;
        const exchange = await exchangePoints(supabase, session_id, points_to_exchange);
        result = exchange;
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error) {
    logger.error('[economy] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// Mining System
// ============================================

async function mineAGU(supabase: any, session_id: string, wallet: any) {
  const lastClaim = wallet?.last_mine_claim_at;
  const now = new Date();

  // Can mine once per day
  if (lastClaim) {
    const hoursSinceClaim = (now.getTime() - new Date(lastClaim).getTime()) / (1000 * 60 * 60);
    if (hoursSinceClaim < 24) {
      return {
        error: 'Mine cooldown - try again later',
        hours_remaining: Math.round(24 - hoursSinceClaim),
      };
    }
  }

  // Calculate mining reward (5-20 AGU, increases with streak)
  const streak = wallet?.mine_streak || 0;
  const baseReward = streak > 5 ? 10 + Math.min(streak, 50) : 20 + streak;
  const reward = Math.floor(Math.random() * (20 - baseReward + 1)) + baseReward;

  if (!wallet) {
    // Create wallet
    const { data: newWallet } = await supabase
      .from('soul_wallets')
      .insert({
        session_id,
        agu_balance: reward,
        agu_lifetime_earned: reward,
        last_mine_claim_at: now.toISOString(),
        mine_streak: 1,
        total_blocks_mined: 1,
      })
      .select()
      .single();

    return {
      wallet: newWallet,
      mined_agu: reward,
    };
  }

  // Update wallet
  const { data: updated } = await supabase
    .from('soul_wallets')
    .update({
      agu_balance: wallet.agu_balance + reward,
      agu_lifetime_earned: wallet.agu_lifetime_earned + reward,
      last_mine_claim_at: now.toISOString(),
      mine_streak: streak + 1,
      total_blocks_mined: wallet.total_blocks_mined + 1,
      updated_at: now.toISOString(),
    })
    .eq('session_id', session_id)
    .select()
    .single();

  // Create transaction
  await supabase.from('soul_transactions').insert({
    sender_session_id: null, // System
    receiver_session_id: session_id,
    amount_agu: reward,
    transaction_type: 'mine',
    description: `Mined ${reward} AGU`,
    created_at: now.toISOString(),
  });

  return {
    wallet: updated,
    mined_agu: reward,
  };
}

// ============================================
// Property System
// ============================================

async function buyProperty(supabase: any, session_id: string, plot_id: string, wallet: any) {
  if (!wallet || wallet.agu_balance <= 0) {
    return { error: 'Insufficient AGU balance' };
  }

  // Find property
  const { data: property } = await supabase
    .from('soul_households')
    .select('*')
    .eq('plot_id', plot_id)
    .single();

  if (!property) {
    return { error: 'Property not found' };
  }

  const price = property.sale_price_agu || (property.house_level * 100);

  if (wallet.agu_balance < price) {
    return { error: 'Insufficient AGU balance' };
  }

  // If property has an owner, update ownership
  if (property.session_id) {
    await supabase
      .from('soul_households')
      .update({
        session_id,
        is_for_sale: false,
        sale_price_agu: null,
        sale_listed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', property.id);
  } else {
    // Unowned property
    await supabase
      .from('soul_households')
      .update({
        session_id,
        is_for_sale: false,
        sale_price_agu: null,
        sale_listed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', property.id);
  }

  // Deduct AGU
  await supabase
    .from('soul_wallets')
    .update({
      agu_balance: wallet.agu_balance - price,
      agu_lifetime_spent: wallet.agu_lifetime_spent + price,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', session_id);

  // Create transaction
  await supabase.from('soul_transactions').insert({
    sender_session_id: session_id,
    receiver_session_id: property.session_id || null,
    amount_agu: price,
    transaction_type: 'property_sale',
    reference_type: 'household',
    reference_id: property.id,
    description: `Bought ${property.house_name} at plot ${plot_id}`,
    created_at: new Date().toISOString(),
  });

  return { property_id: property.id, spent_agu: price };
}

async function sellProperty(supabase: any, session_id: string, household_id: string) {
  if (!household_id) {
    return { error: 'household_id required' };
  }

  const { data: property } = await supabase
    .from('soul_households')
    .select('*')
    .eq('id', household_id)
    .single();

  if (!property) {
    return { error: 'Property not found' };
  }

  if (property.session_id !== session_id) {
    return { error: 'Do not own this property' };
  }

  // List for sale
  await supabase
    .from('soul_households')
    .update({
      is_for_sale: true,
      sale_price_agu: property.house_level * 200, // Default price
      sale_listed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', property.id);

  return {
    property_id: property.id,
    listed: true,
    price: property.house_level * 200,
  };
}

// ============================================
// Points Exchange
// ============================================

async function exchangePoints(supabase: any, session_id: string, points_to_exchange: number = 100) {
  const { data: wallet } = await supabase
    .from('soul_wallets')
    .select('*')
    .eq('session_id', session_id)
    .single();

  if (!wallet) {
    return { error: 'Wallet not found' };
  }

  if (wallet.points_balance < points_to_exchange) {
    return { error: 'Insufficient points' };
  }

  // Simplified exchange rate: 100 points = 1 AGU
  const agu_income = Math.floor(points_to_exchange / 100);

  if (agu_income <= 0) {
    return { error: 'Exchange amount too small' };
  }

  const { data: updated } = await supabase
    .from('soul_wallets')
    .update({
      points_balance: wallet.points_balance - points_to_exchange,
      agu_balance: wallet.agu_balance + agu_income,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', session_id)
    .select()
    .single();

  // Create transaction
  await supabase.from('soul_transactions').insert({
    sender_session_id: null, // System
    receiver_session_id: session_id,
    amount_agu: agu_income,
    transaction_type: 'point_exchange',
    description: `Exchanged ${points_to_exchange} points for ${agu_income} AGU`,
    created_at: new Date().toISOString(),
  });

  return {
    wallet: updated,
    exchanged_agu: agu_income,
  };
}

// ============================================
// GET Economy Status
// ============================================

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const session_id = url.searchParams.get('session_id');

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // Parallel: load wallet, properties, transactions
    const [walletRes, propertiesRes, transactionsRes] = await Promise.all([
      supabase.from('soul_wallets').select('*').eq('session_id', session_id).single(),
      supabase.from('soul_households').select('*').eq('session_id', session_id),
      supabase
        .from('soul_transactions')
        .select('*')
        .or(`receiver_session_id.eq.${session_id},sender_session_id.eq.${session_id}`)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const wallet = walletRes.data;
    const properties = propertiesRes.data || [];
    const transactions = transactionsRes.data || [];

    return NextResponse.json({
      success: true,
      wallet,
      properties,
      transactions,
    });

  } catch (error) {
    logger.error('[economy] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
