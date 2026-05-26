import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json(
      { success: false, error: "邮箱不能为空" },
      { status: 400 }
    )
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/settings`,
  })

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "密码重置邮件已发送，请检查邮箱",
  })
}
