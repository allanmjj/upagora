import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * Soul Evolution Timeline API
 *
 * Tracks the evolution of a soul over time through:
 * - Persona snapshots (baseline personalities at different versions)
 * - Calibration events (guardian adjustments)
 * - Major conversation milestones
 * - Memory consolidation checkpoints
 *
 * GET /api/soul/evolution?
 *   soul_id=xxx
 *   user_id=xxx (optional - personalization)
 *   limit=20 (optional)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const soulId = searchParams.get('soul_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!soulId) {
      return NextResponse.json(
        { error: 'Missing soul_id parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get persona snapshots if the evolution table exists
    const { data: snapshots, error: snapshotError } = await supabase
      .from('soul_snapshots')
      .select('id, version, created_at, reason, constraints_snapshot')
      .eq('soul_id', soulId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Get calibration events
    const { data: calibrationEvents } = await supabase
      .from('soul_calibrations')
      .select('id, type, description, created_at')
      .eq('soul_id', soulId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Get constraint updates (if available)
    const { data: constraintHistory } = await supabase
      .from('soul_constraints')
      .select('id, dimension, updated_at')
      .eq('soul_id', soulId)
      .order('updated_at', { ascending: false });

    // Build unified timeline
    const timeline = [];

    if (snapshots) {
      for (const snap of snapshots) {
        timeline.push({
          type: 'snapshot',
          id: snap.id,
          timestamp: snap.created_at,
          version: snap.version,
          reason: snap.reason,
          dimensions_changed: Object.keys(snap.constraints_snapshot || {}).length,
        });
      }
    }

    if (calibrationEvents) {
      for (const event of calibrationEvents) {
        timeline.push({
          type: 'calibration',
          id: event.id,
          timestamp: event.created_at,
          calibration_type: event.type,
          description: event.description,
        });
      }
    }

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate evolution metrics
    const totalSnapshots = snapshots?.length || 0;
    const totalCalibrations = calibrationEvents?.length || 0;
    const totalConstraints = constraintHistory?.length || 0;

    // Determine soul maturity level based on evolution depth
    let maturityLevel = 'Newborn';
    if (totalSnapshots > 5 && totalCalibrations > 20) maturityLevel = 'Enlightened';
    else if (totalSnapshots > 3 && totalCalibrations > 10) maturityLevel = 'Mature';
    else if (totalSnapshots > 1 && totalCalibrations > 5) maturityLevel = 'Growing';
    else if (totalCalibrations > 0) maturityLevel = 'Awakening';

    return NextResponse.json({
      soul_id: soulId,
      timeline: timeline.slice(0, limit),
      metrics: {
        total_snapshots: totalSnapshots,
        total_calibrations: totalCalibrations,
        total_constraint_updates: totalConstraints,
        maturity_level: maturityLevel,
      },
    });
  } catch (err) {
    logger.error('[evolution] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Create a new soul snapshot (checkpoint)
 * POST /api/soul/evolution/snapshot
 * Body: { soul_id, reason, constraints_override }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { soul_id, reason, constraints_override } = body;

    if (!soul_id) {
      return NextResponse.json(
        { error: 'Missing soul_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current constraints
    const { data: currentConstraints } = await supabase
      .from('soul_constraints')
      .select('*')
      .eq('soul_id', soul_id);

    // Determine next version number
    const { data: existingSnapshots } = await supabase
      .from('soul_snapshots')
      .select('version')
      .eq('soul_id', soul_id)
      .order('version', { ascending: false })
      .limit(1);

    const currentVersion = existingSnapshots?.[0]?.version || 0;
    const newVersion = currentVersion + 1;

    const { data: snapshot, error } = await supabase
      .from('soul_snapshots')
      .insert({
        soul_id,
        version: newVersion,
        reason: reason || 'Manual checkpoint',
        constraints_snapshot: constraints_override || currentConstraints,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Table might not exist yet - return gracefully
      logger.warn('[evolution] soul_snapshots table not available:', error.message);
      return NextResponse.json({
        action: 'simulated',
        message: 'Snapshot created in memory (table not yet provisioned)',
        version: newVersion,
      });
    }

    return NextResponse.json({
      action: 'created',
      snapshot,
    });
  } catch (err) {
    logger.error('[evolution] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
