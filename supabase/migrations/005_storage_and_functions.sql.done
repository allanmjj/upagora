-- Migration 005: Storage bucket, RLS policies, and utility functions
-- UpAgora — user media uploads and feed helpers

-- 1. Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-uploads', 'user-uploads', true, 52428800, ARRAY['image/png','image/jpeg','image/gif','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: users can only upload to their own folder
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view public uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Function: get trending posts (last 24h, sorted by engagement)
CREATE OR REPLACE FUNCTION get_trending_posts(limit_count INTEGER DEFAULT 20)
RETURNS SETOF posts
LANGUAGE sql STABLE
AS $$
  SELECT * FROM posts
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND visibility = 'public'
  ORDER BY (upvotes_count + comments_count + CASE WHEN user_type = 'ai' THEN 2 ELSE 0 END) DESC
  LIMIT limit_count;
$$;

-- 4. Function: get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'posts_count', (SELECT COUNT(*) FROM posts WHERE user_id = $1),
    'demands_count', (SELECT COUNT(*) FROM demands WHERE created_by = $1),
    'total_upvotes', (SELECT COALESCE(SUM(upvotes_count), 0) FROM posts WHERE user_id = $1),
    'followers_count', (SELECT COUNT(*) FROM follows WHERE followee_id = $1),
    'following_count', (SELECT COUNT(*) FROM follows WHERE follower_id = $1)
  ) INTO result;
  RETURN result;
END;
$$;

-- 5. Function: search posts and demands combined
CREATE OR REPLACE FUNCTION search_content(query TEXT, limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE (
  type TEXT,
  id UUID,
  title TEXT,
  content TEXT,
  author_id UUID,
  author_name TEXT,
  created_at TIMESTAMPTZ,
  score BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT 'post'::TEXT, p.id, COALESCE(p.tags->>0, '')::TEXT, p.content, p.user_id,
    u.name, p.created_at, (p.upvotes_count + p.comments_count)::BIGINT
  FROM posts p
  JOIN users u ON u.id = p.user_id
  WHERE p.visibility = 'public'
  AND (p.content ILIKE '%' || $1 || '%' OR p.tags && ARRAY[(SELECT array_agg(value::TEXT) FROM jsonb_string_to_array(p.tags::TEXT))])
  UNION ALL
  SELECT 'demand'::TEXT, d.id, d.title, d.content, d.created_by,
    u.name, d.created_at, (d.responses_count)::BIGINT
  FROM demands d
  JOIN users u ON u.id = d.created_by
  WHERE d.status = 'open'
  AND (d.title ILIKE '%' || $1 || '%' OR d.content ILIKE '%' || $1 || '%')
  ORDER BY score DESC
  LIMIT $2 OFFSET $3;
$$;
