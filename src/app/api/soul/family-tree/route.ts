import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/soul/family-tree
 *
 * Returns soul family tree showing:
 * - Soul evolution lineage (versions)
 * - Guardian relationships
 * - Soul-to-soul connections
 *
 * Uses soul_versions, soul_guardians, soul_relationships tables.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const soul_id = searchParams.get('soul_id');

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allNodes: any[] = [];
    const seen = new Set<string>();

    function addNode(id: string, data: any) {
      if (!seen.has(id)) {
        seen.add(id);
        allNodes.push({ id, ...data });
      }
    }

    if (soul_id) {
      // Fetch a specific soul's tree
      // 1. Get the main soul info
      const { data: soul } = await supabase
        .from('soul_gallery')
        .select('id, name, avatar_url, created_at, category')
        .eq('id', soul_id)
        .single();

      if (soul) {
        addNode(soul_id, {
          name: soul.name || 'Unknown Soul',
          avatar_url: soul.avatar_url || undefined,
          created_at: soul.created_at || new Date().toISOString(),
          category: soul.category || 'soul',
          type: 'soul',
        });

        // 2. Get soul versions (evolution lineage)
        const { data: versions } = await supabase
          .from('soul_versions')
          .select('id, version, created_at, from_version')
          .eq('soul_id', soul_id)
          .order('version', { ascending: true });

        for (const v of versions || []) {
          addNode(`version-${v.id}`, {
            name: `v${v.version}`,
            parent_id: v.from_version ? `version-${versions?.find(x => x.version === v.from_version)?.id}` : soul_id,
            created_at: v.created_at || new Date().toISOString(),
            type: 'version',
          });
        }

        // 3. Get guardians of this soul
        const { data: guardians } = await supabase
          .from('soul_guardians')
          .select('user_id, role, created_at')
          .eq('soul_id', soul_id);

        for (const g of guardians || []) {
          addNode(`guardian-${g.user_id}`, {
            name: 'Guardian',
            parent_id: soul_id,
            created_at: g.created_at || new Date().toISOString(),
            type: 'guardian',
            role: g.role,
          });
        }
      }
    } else {
      // Show all user's souls as root nodes
      const { data: souls } = await supabase
        .from('soul_gallery')
        .select('id, name, avatar_url, created_at, category')
        .eq('user_id', user.id);

      for (const s of souls || []) {
        addNode(s.id, {
          name: s.name || 'Unknown Soul',
          avatar_url: s.avatar_url || undefined,
          created_at: s.created_at || new Date().toISOString(),
          category: s.category || 'soul',
          type: 'soul',
        });

        // Quick guardian summary
        const { data: guardians } = await supabase
          .from('soul_guardians')
          .select('user_id, role')
          .eq('soul_id', s.id);

        for (const g of guardians || []) {
          addNode(`guardian-${s.id}-${g.user_id}`, {
            name: 'Guardian',
            parent_id: s.id,
            type: 'guardian',
            role: g.role,
          });
        }
      }
    }

    // Calculate generation for each node
    const nodeMap = new Map<string, any>();
    allNodes.forEach(n => nodeMap.set(n.id, n));

    for (const node of allNodes) {
      let depth = 0;
      let current = node;
      while (current?.parent_id && depth < 10) {
        const parent = nodeMap.get(current.parent_id);
        if (!parent) break;
        depth++;
        current = parent;
      }
      node.generation = depth;
    }

    // Find roots
    const roots = allNodes.filter(n => !n.parent_id);

    return NextResponse.json({
      roots: roots.length > 0 ? roots : allNodes,
      allNodes,
    });
  } catch (err) {
    logger.error('[family-tree] Unexpected error:', err);
    return NextResponse.json({ roots: [], allNodes: [] });
  }
}
