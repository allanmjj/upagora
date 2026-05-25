import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * POST /api/soul/questionnaire
 * Save questionnaire results to soul profile
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authRes.error || !authRes.data.user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = authRes.data.user.id
    const body = await req.json()
    const { answers, result } = body

    if (!answers || !result) {
      return NextResponse.json({ error: 'Missing answers or result' }, { status: 400 })
    }

    // Save questionnaire result
    const { data: questionnaire, error: qError } = await supabase
      .from('soul_questionnaires')
      .insert({
        user_id: userId,
        answers,
        dimension_scores: result.dimensionScores,
        overall_score: result.overallScore,
        dominant_traits: result.dominantTraits,
        soul_type: result.soulType,
      })
      .select('id')
      .single()

    if (qError) {
      console.error('Questionnaire save error:', qError)
      return NextResponse.json({ error: 'Failed to save questionnaire' }, { status: 500 })
    }

    // Update soul session with questionnaire insights
    const { data: session } = await supabase
      .from('soul_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (session) {
      // Create dimension extractions from questionnaire results
      const extractions = (result.dimensionScores || [])
        .filter((d: { score: number }) => d.score > 0)
        .map((dim: { key: string; label: string; score: number; traits: string[] }) => ({
          session_id: session.id,
          dimension: dim.key,
          confidence: Math.min(1, dim.score / 9),
          key_insights: {
            source: 'questionnaire',
            traits: dim.traits,
            score: dim.score,
            label: dim.label,
          },
        }))

      if (extractions.length > 0) {
        await supabase
          .from('soul_extractions')
          .upsert(extractions, { onConflict: 'session_id,dimension' })
          .then(() => {
            // Update dimension filled count
            return supabase
              .from('soul_sessions')
              .update({
                extraction_status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', session.id)
          })
          .catch((err) => console.error('Extraction save error:', err))
      }
    }

    return NextResponse.json({
      message: 'Questionnaire saved to soul profile',
      questionnaire_id: questionnaire?.id,
    })
  } catch (err) {
    console.error('Questionnaire error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
