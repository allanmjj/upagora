import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { HOT_SCORE_LIKE_WEIGHT, HOT_SCORE_REPLY_WEIGHT } from '@/lib/constants'

function computeHotScore(likeCount: number, replyCount: number, createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageHours = Math.max(1, ageMs / 3600000)
  return (likeCount * HOT_SCORE_LIKE_WEIGHT + replyCount * HOT_SCORE_REPLY_WEIGHT) / Math.sqrt(ageHours)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const { user } = await getAuthUser(req)

  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  const adminClient = createAdminClient()

  const { data: post, error: postError } = await adminClient
    .from('posts')
    .select('id, like_count, reply_count, created_at')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return errorResponse('NOT_FOUND', 'Post not found', 404)
  }

  const { data: existingLike } = await adminClient
    .from('post_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle()

  let liked: boolean
  let likeCount: number

  if (existingLike) {
    const { error: unlikeError } = await adminClient
      .from('post_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId)

    if (unlikeError) {
      return errorResponse('INTERNAL_ERROR', unlikeError.message, 500)
    }

    likeCount = Math.max(0, post.like_count - 1)
    liked = false
  } else {
    const { error: likeError } = await adminClient
      .from('post_likes')
      .insert({ user_id: user.id, post_id: postId })

    if (likeError) {
      return errorResponse('INTERNAL_ERROR', likeError.message, 500)
    }

    likeCount = post.like_count + 1
    liked = true
  }

  const hotScore = computeHotScore(likeCount, post.reply_count, post.created_at)

  await adminClient
    .from('posts')
    .update({ like_count: likeCount, hot_score: hotScore })
    .eq('id', postId)

  return successResponse({ liked, like_count: likeCount })
}
