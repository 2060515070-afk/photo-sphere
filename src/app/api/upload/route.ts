import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const moduleId = formData.get('moduleId') as string || 'all'

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 })
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `photos/${fileName}`

    // 上传到 Supabase Storage
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: '上传失败' }, { status: 500 })
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filePath)

    // 创建缩略图 URL（Supabase 图片变换）
    const thumbnailUrl = `${urlData.publicUrl}?width=400&height=400&resize=cover`

    // 保存到数据库
    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        url: urlData.publicUrl,
        thumbnail: thumbnailUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        module_id: moduleId,
        tags: [],
        faces: [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: '保存失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      photo: {
        id: photo.id,
        url: urlData.publicUrl,
        thumbnail: thumbnailUrl,
      },
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
