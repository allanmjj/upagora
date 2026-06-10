import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id') || id;

    // Get session info
    const { data: session, error: session_err } = await supabase
      .from('soul_sessions')
      .select('session_slug, subject_name, initials, calibration_count')
      .eq('id', session_id)
      .single();

    if (session_err || !session) {
      // Fallback to generic card
      return createGenericCard();
    }

    // Get dimensions for radar display
    const { data: dimensions } = await supabase
      .from('soul_dimensions')
      .select('dimension, score')
      .eq('session_id', session_id);

    const dimensionMap: Record<string, number> = {};
    for (const d of dimensions || []) {
      dimensionMap[d.dimension] = d.score;
    }

    // Get chat count
    const { count: chat_count } = await supabase
      .from('soul_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id);

    const initials = session.initials || session.subject_name?.charAt(0) || '?';
    const calibrations = session.calibration_count || 0;
    const chats = chat_count || 0;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            padding: 40,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Border */}
          <div
            style={{
              position: 'absolute',
              inset: 20,
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 12,
            }}
          />

          {/* Avatar */}
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <span style={{ fontSize: 72, fontWeight: 'bold', color: '#fff' }}>
              {initials.slice(0, 2).toUpperCase()}
            </span>
          </div>

          {/* Name */}
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 16 }}>
            {session.subject_name}
          </div>

          {/* Stats */}
          <div style={{ fontSize: 28, color: '#94a3b8', marginBottom: 40 }}>
            {calibrations > 0 && `${calibrations} calibrations`}
            {calibrations > 0 && chats > 0 && '  ·  '}
            {chats > 0 && `${chats} conversations`}
          </div>

          {/* Dimension bars */}
          <div style={{ width: '80%', marginBottom: 40 }}>
            {[
              { key: 'cognitive_patterns', label: 'Cognitive' },
              { key: 'value_judgment', label: 'Values' },
              { key: 'expression_style', label: 'Expression' },
              { key: 'knowledge_structure', label: 'Knowledge' },
              { key: 'emotional_response', label: 'Emotional' },
              { key: 'relationship_memory', label: 'Social' },
              { key: 'life_narrative', label: 'Narrative' },
            ].map((dim) => (
              <div key={dim.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: '#94a3b8', width: 120, textAlign: 'right', marginRight: 16 }}>
                  {dim.label}
                </span>
                <div style={{ flex: 1, height: 8, backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${(dimensionMap[dim.key] || 0.5) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ position: 'absolute', bottom: 40 }}>
            <div style={{ fontSize: 24, color: '#6366f1', fontWeight: 'bold', textAlign: 'center' }}>
              UpAgora · Soul Distillation
            </div>
            <div style={{ fontSize: 18, color: '#475569', textAlign: 'center', marginTop: 4 }}>
              upagora.com
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err) {
    logger.error('OG image generation error:', err);
    return createGenericCard();
  }
}

function createGenericCard() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 16 }}>
          UpAgora
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8' }}>
          Soul Distillation Platform
        </div>
        <div style={{ fontSize: 20, color: '#6366f1', marginTop: 20 }}>
          upagora.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
