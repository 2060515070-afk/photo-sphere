import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 验证用户密码
export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, password_hash')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const hash = crypto.createHash('sha256').update(password + 'photo-sphere-salt').digest('hex')

    if (hash !== user.password_hash) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 })
    }

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name } })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
