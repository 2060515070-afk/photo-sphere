import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'admin888'

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'photo-sphere-salt').digest('hex')
}

// 获取所有用户（不返回密码）
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, icon, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 统计每个用户的照片数
    const usersWithCount = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
        return { ...user, photoCount: count || 0 }
      })
    )

    return NextResponse.json({ users: usersWithCount })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 创建新用户（需要总密码）
export async function POST(request: NextRequest) {
  try {
    const { masterPassword, name, password, icon } = await request.json()

    if (!masterPassword || !name || !password) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (masterPassword !== MASTER_PASSWORD) {
      return NextResponse.json({ error: '总密码错误' }, { status: 403 })
    }

    const id = crypto.randomUUID()
    const passwordHash = hashPassword(password)

    const { data: user, error } = await supabase
      .from('users')
      .insert({ id, name, password_hash: passwordHash, icon: icon || '📷' })
      .select('id, name, icon, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    // 为新用户创建默认分类模块
    const defaultModules = [
      { id: crypto.randomUUID(), name: '全部照片', icon: '📸', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '人物', icon: '👤', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '环境', icon: '🌍', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '游玩', icon: '🎢', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '任务', icon: '📋', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '美食', icon: '🍔', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '动物', icon: '🐱', is_system: true, user_id: id },
      { id: crypto.randomUUID(), name: '其他', icon: '🎨', is_system: true, user_id: id },
    ]

    await supabase.from('modules').insert(defaultModules)

    return NextResponse.json({ success: true, user })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
