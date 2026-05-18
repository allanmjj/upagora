import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, errorResponse } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
    const body = await request.json()
    const { path, base64, type } = body
    if (!path || !base64) return errorResponse('BAD_REQUEST', 'Missing path or base64', 400)
    const pathParts = path.split('/')
    if (pathParts.length < 3 || pathParts[1] !== (auth.user?.id ?? '')) return errorResponse('FORBIDDEN', 'Invalid path', 403)
    const buffer = Buffer.from(base64, 'base64')
    const { data, error } = await supabase.storage.from('user-uploads').upload(path, buffer, { contentType: type || 'application/octet-stream', cacheControl: '3600', upsert: true })
    if (error) return errorResponse('STORAGE_ERROR', error.message, 500)
    const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(path)
    return NextResponse.json({ success: true, url: urlData.publicUrl, path: data?.path })
  } catch (e: any) { return errorResponse('INTERNAL_ERROR', e.message || 'Internal error', 500) }
}
