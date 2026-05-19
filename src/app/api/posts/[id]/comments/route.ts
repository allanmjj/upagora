import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { HOT_SCORE_LIKE_WEIGHT, HOT_SCORE_REPLY_WEIGHT } from '@/lib/constants'
import type { Comment, PaginatedResponse } from '@/types/api'

const COMMENTS_PER_PAGE = 20

function computeHotScore(likeCount: number, replyCount: number, createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageHours = Math.max(1, ageMs / 3600000)
  return (likeCount * HOT_SCORE_LIKE_WEIGHT + replyCount * HOT_SCORE_REPLY_WEIGHT) / Math.sqrt(ageHours)
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const offset = (page - 1) * COMMENTS_PER_PAGE

  const adminClient = createAdminClient()

  const { data: post } = await adminClient
    .from('posts')
    .select('id')
    .eq('id', postId)
    .single()

  if (!post) {
    return errorResponse('NOT_FOUND', 'Post not found', 404)
  }

  const { data: comments, error, count } = await adminClient
    .from('comments')
    .select(`
      id,
      post_id,
      author_id,
      content,
      like_count,
      created_at,
      author:users!comments_author_id_fkey(id, name, username, user_type, avatar_url)
    `, { count: 'exact' })
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .range(offset, offset + COMMENTS_PER_PAGE - 1)

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Operation failed', 500)
  }

  const result: PaginatedResponse<Comment> = {
    success: true,
    data: (comments || []) as unknown as Comment[],
    count: count || 0,
    page,
    pageSize: COMMENTS_PER_PAGE,
    hasMore: (count || 0) > offset + COMMENTS_PER_PAGE,
  }

  return Response.json(result)
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

  let body: { content: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const { content } = body
  if (!content?.trim()) {
    return errorResponse('BAD_REQUEST', 'Content is required', 400)
  }

  if (content.length > 1000) {
    return errorResponse('BAD_REQUEST', 'Content exceeds 1000 characters', 400)
  }

  const adminClient = createAdminClient()

  const { data: post } = await adminClient
    .from('posts')
    .select('id, like_count, reply_count, created_at')
    .eq('id', postId)
    .single()

  if (!post) {
    return errorResponse('NOT_FOUND', 'Post not found', 404)
  }

  const { data: comment, error: insertError } = await adminClient
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content: content.trim(),
    })
    .select(`
      id,
      post_id,
      author_id,
      content,
      like_count,
      created_at,
      author:users!comments_author_id_fkey(id, name, username, user_type, avatar_url)
    `)
    .single()

  if (insertError) {
    return errorResponse('INTERNAL_ERROR', insertError.message, 500)
  }

  // Update reply_count and hot_score
  const newReplyCount = post.reply_count + 1
  const newHotScore = computeHotScore(post.like_count, newReplyCount, post.created_at)

  await adminClient
    .from('posts')
    .update({
      reply_count: newReplyCount,
      hot_score: newHotScore,
    })
    .eq('id', postId)

  return successResponse(comment as unknown as Comment, 'Comment created', 201)
}
