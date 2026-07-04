import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabase.from('modules').select('*').order('created_at', { ascending: true })
    if (userId) query = query.eq('user_id', userId)

    const { data: modules, error } = await query
    if (error) return NextResponse.json({ error: '查询失败' }, { status: 500 })

    let photoQuery = supabase.from('photos').select('*', { count: 'exact', head: true })
    if (userId) photoQuery = photoQuery.eq('user_id', userId)
    const { count: totalCount } = await photoQuery

    const modulesWithCount = await Promise.all(
      (modules || []).map(async (mod) => {
        if (mod.id === 'all') return { ...mod, count: totalCount || 0 }
        let q = supabase.from('photos').select('*', { count: 'exact', head: true }).eq('module_id', mod.id)
        if (userId) q = q.eq('user_id', userId)
        const { count } = await q
        return { ...mod, count: count || 0 }
      })
    )

    return NextResponse.json({ modules: modulesWithCount })
  } catch (err) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, icon, userId } = await request.json()
    if (!name) return NextResponse.json({ error: '缺少模块名称' }, { status: 400 })

    const { data: module, error } = await supabase
      .from('modules')
      .insert({ id: crypto.randomUUID(), name, icon: icon || '📁', is_system: false, user_id: userId || null })
      .select().single()

    if (error) return NextResponse.json({ error: '创建失败' }, { status: 500 })
    return NextResponse.json({ success: true, module })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少模块 ID' }, { status: 400 })

    const { data: module } = await supabase.from('modules').select('is_system').eq('id', id).single()
    if (module?.is_system) return NextResponse.json({ error: '不能删除系统模块' }, { status: 400 })

    await supabase.from('photos').update({ module_id: 'other' }).eq('module_id', id)
    const { error } = await supabase.from('modules').delete().eq('id', id)
    if (error) return NextResponse.json({ error: '删除失败' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
