import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 获取照片列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('photos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 如果不是"全部照片"，按模块筛选
    if (moduleId !== 'all') {
      query = query.eq('module_id', moduleId)
    }

    const { data: photos, error, count } = await query

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json({ error: '查询失败' }, { status: 500 })
    }

    return NextResponse.json({
      photos: photos || [],
      total: count || 0,
      page,
      limit,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err) {
    console.error('Photos API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 删除照片
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '缺少照片 ID' }, { status: 400 })
    }

    // 先查询照片信息
    const { data: photo, error: fetchError } = await supabase
      .from('photos')
      .select('url')
      .eq('id', id)
      .single()

    if (fetchError || !photo) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 })
    }

    // 从 Storage 删除文件
    const filePath = photo.url.split('/').pop()
    if (filePath) {
      await supabase.storage.from('photos').remove([`photos/${filePath}`])
    }

    // 从数据库删除记录
    const { error: deleteError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 更新照片模块
export async function PATCH(request: NextRequest) {
  try {
    const { id, moduleId, tags } = await request.json()

    if (!id) {
      return NextResponse.json({ error: '缺少照片 ID' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (moduleId) updates.module_id = moduleId
    if (tags) updates.tags = tags

    const { error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update API error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
