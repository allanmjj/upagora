import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/settings/avatar
 * Upload/update user avatar.
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

    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Invalid file type (only images)' }, { status: 400 });
    }

    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `avatars/${userId}_${Date.now()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('soul_assets')
      .upload(filename, uint8Array, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return Response.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('soul_assets').getPublicUrl(filename);

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      avatar_url: urlData.publicUrl,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
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
