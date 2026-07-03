import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 获取所有模块
export async function GET() {
  try {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Modules query error:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    // 先查总数（给"全部照片"用）
    const { count: totalCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })

    // 统计每个模块的照片数量
    const modulesWithCount = await Promise.all(
      (modules || []).map(async (mod) => {
        if (mod.id === 'all') {
          return { ...mod, count: totalCount || 0 }
        }
        const { count } = await supabase
          .from('photos')
          .select('*', { count: 'exact', head: true })
          .eq('module_id', mod.id)

        return { ...mod, count: count || 0 }
      })
    )

    return NextResponse.json({ modules: modulesWithCount })
  } catch (err) {
    console.error('Modules API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 创建新模块
export async function POST(request: NextRequest) {
  try {
    const { name, icon } = await request.json()

    if (!name) {
      return NextResponse.json({ error: '缺少模块名称' }, { status: 400 })
    }

    const { data: module, error } = await supabase
      .from('modules')
      .insert({
        id: crypto.randomUUID(),
        name,
        icon: icon || '📁',
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Create module error:', error)
      return NextResponse.json({ error: '创建失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, module })
  } catch (err) {
    console.error('Create module API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除模块
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '缺少模块 ID' }, { status: 400 })
    }

    // 检查是否是系统模块
    const { data: module } = await supabase
      .from('modules')
      .select('is_system')
      .eq('id', id)
      .single()

    if (module?.is_system) {
      return NextResponse.json({ error: '不能删除系统模块' }, { status: 400 })
    }

    // 将该模块的照片移到"其他"
    await supabase
      .from('photos')
      .update({ module_id: 'other' })
      .eq('module_id', id)

    // 删除模块
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete module error:', error)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete module API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
