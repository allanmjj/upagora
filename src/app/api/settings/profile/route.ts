import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser, errorResponse, successResponse } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/settings/avatar
 * Upload/update user avatar.
 * Supports profile picture for soul creator.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return Response.json({ error: 'No avatar file provided' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Invalid file type (only images)' }, { status: 400 });
    }

    // Generate unique filename
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `avatars/${userId}_${Date.now()}.${extension}`;

    // Upload to Supabase storage
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('soul_assets')
      .upload(filename, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return Response.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('soul_assets')
      .getPublicUrl(filename);

    // Update user profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json({
      success: true,
      avatar_url: urlData.publicUrl,
      message: 'Avatar updated successfully',
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/settings/profile
 * Get current user's profile data.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;

    // Get profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url, bio, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile fetch error:', error);
      return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return Response.json({
      profile: profile || {
        id: userId,
        username: '',
        name: '',
        avatar_url: '',
        bio: '',
      },
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/settings/profile
 * Update user profile data.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Missing auth' }, { status: 401 });
    }

    const authRes = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authRes.error) {
      return Response.json({ error: authRes.error.message }, { status: 401 });
    }

    const userId = authRes.data.user.id;
    const body = await req.json();
    const { name, username, bio, avatar_url } = body as { name?: string; username?: string; bio?: string; avatar_url?: string };

    // Validate inputs
    if (name && name.length > 100) {
      return Response.json({ error: 'Name too long (max 100)' }, { status: 400 });
    }
    if (username && username.length > 50) {
      return Response.json({ error: 'Username too long (max 50)' }, { status: 400 });
    }
    if (bio && bio.length > 500) {
      return Response.json({ error: 'Bio too long (max 500)' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name,
        username,
        bio,
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json({
      success: true,
      profile,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
