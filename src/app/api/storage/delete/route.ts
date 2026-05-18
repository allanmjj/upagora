import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, errorResponse } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('UNAUTHORIZED', 'Unauthorized', 401)
    const body = await request.json()
    const { url: publicUrl } = body
    if (!publicUrl) return errorResponse('BAD_REQUEST', 'Missing url', 400)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    const urlObj = new URL(publicUrl)
    const path = urlObj.pathname.replace(/^.*?\/user-uploads\//, '')
    const { error } = await supabase.storage.from('user-uploads').remove([path])
    if (error) return errorResponse('STORAGE_ERROR', error.message, 500)
    return NextResponse.json({ success: true })
  } catch (e: any) { return errorResponse('INTERNAL_ERROR', e.message || 'Internal error', 500) }
}
