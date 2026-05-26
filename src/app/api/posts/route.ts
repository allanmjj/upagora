import { getAuthUser, errorResponse, successResponse } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { POSTS_PER_PAGE, DEFAULT_POST_VISIBILITY } from '@/lib/constants'
import type { Post, AuthUser, CreatePostRequest, PaginatedResponse } from '@/types/api'

function normalizeAuthor(raw: any): AuthUser | undefined {
  if (!raw) return undefined
  // Supabase may return author as array for foreign key joins
  const a = Array.isArray(raw) ? raw[0] : raw
  if (!a) return undefined
  return {
    id: a.id,
    email: a.email ?? null,
    name: a.name,
    username: a.username,
    user_type: a.user_type,
    avatar_url: a.avatar_url ?? null,
    capabilities: a.capabilities ?? [],
    credits: a.credits ?? 0,
    is_verified: a.is_verified ?? false,
    is_email_verified: a.is_email_verified ?? false,
  }
}

function normalizePost(raw: any): Post {
  return {
    id: raw.id,
    author_id: raw.author_id,
    content: raw.content,
    visibility: raw.visibility,
    like_count: raw.like_count,
    reply_count: raw.reply_count,
    repost_count: raw.repost_count,
    share_count: raw.share_count,
    hot_score: raw.hot_score,
    is_pinned: raw.is_pinned,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    author: normalizeAuthor(raw.author),
    tags: raw.tags?.map((t: any) => t.tag ?? t) || [],
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const type = searchParams.get('type') || 'all' // all | human | ai
  const sort = searchParams.get('sort') || 'hot' // hot | latest

  const { user } = await getAuthUser(req)
  const adminClient = createAdminClient()

  const offset = (page - 1) * POSTS_PER_PAGE

  let query = adminClient
    .from('posts')
    .select(`
      id,
      author_id,
      content,
      visibility,
      like_count,
      reply_count,
      repost_count,
      share_count,
      hot_score,
      is_pinned,
      created_at,
      updated_at,
      author:users!posts_author_id_fkey(id, name, username, user_type, avatar_url),
      tags:post_tags(tag)
    `, { count: 'exact' })
    .eq('visibility', 'public')

  if (type === 'human') {
    query = query.eq('author.user_type', 'human')
  } else if (type === 'ai') {
    query = query.eq('author.user_type', 'ai')
  }

  if (sort === 'hot') {
    query = query.order('is_pinned', { ascending: false })
      .order('hot_score', { ascending: false })
      .order('created_at', { ascending: false })
  } else {
    query = query.order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
  }

  query = query.range(offset, offset + POSTS_PER_PAGE - 1)

  const { data: posts, error, count } = await query

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch posts', 500)
  }

  const transformedPosts: Post[] = (posts || []).map(normalizePost)

  // Query is_liked_by_me if user is logged in
  if (user && transformedPosts.length > 0) {
    const postIds = transformedPosts.map((p) => p.id)
    const { data: likes } = await adminClient
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)

    const likedSet = new Set((likes || []).map((l: any) => l.post_id))
    transformedPosts.forEach((post) => {
      post.is_liked_by_me = likedSet.has(post.id)
    })
  }

  const result: PaginatedResponse<Post> = {
    success: true,
    data: transformedPosts,
    count: count || 0,
    page,
    pageSize: POSTS_PER_PAGE,
    hasMore: (count || 0) > offset + POSTS_PER_PAGE,
  }

  return Response.json(result)
}

export async function POST(req: Request) {
  const { user } = await getAuthUser(req)
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401)
  }

  let body: CreatePostRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  const { content, visibility, tags } = body

  if (!content?.trim()) {
    return errorResponse('BAD_REQUEST', 'Content is required', 400)
  }

  if (content.length > 2000) {
    return errorResponse('BAD_REQUEST', 'Content exceeds 2000 characters', 400)
  }

  const adminClient = createAdminClient()

  const { data: post, error } = await adminClient
    .from('posts')
    .insert({
      author_id: user.id,
      content: content.trim(),
      visibility: visibility || DEFAULT_POST_VISIBILITY,
      hot_score: 0,
    })
    .select(`
      id,
      author_id,
      content,
      visibility,
      like_count,
      reply_count,
      repost_count,
      share_count,
      hot_score,
      is_pinned,
      created_at,
      updated_at,
      author:users!posts_author_id_fkey(id, name, username, user_type, avatar_url)
    `)
    .single()

  if (error) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch posts', 500)
  }

  // Insert tags if provided
  if (tags?.length) {
    const tagInserts = tags.map((tag) => ({
      post_id: post.id,
      tag: tag.trim(),
    }))
    await adminClient.from('post_tags').insert(tagInserts)
  }

  // Fetch tags to include in response
  const { data: postTags } = await adminClient
    .from('post_tags')
    .select('tag')
    .eq('post_id', post.id)

  const result: Post = {
    ...normalizePost(post),
    tags: postTags?.map((t: any) => t.tag) || [],
    is_liked_by_me: false,
  }

  return successResponse(result, 'Post created', 201)
}
