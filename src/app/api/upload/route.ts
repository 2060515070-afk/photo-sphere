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
    const moduleId = formData.get('moduleId') as string || 'other'
    const userId = formData.get('userId') as string || null

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(`photos/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: '上传失败' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(`photos/${fileName}`)

    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        url: urlData.publicUrl,
        thumbnail: urlData.publicUrl,
        file_name: file.name,
        tags: [],
        module_id: moduleId,
        user_id: userId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: '保存失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true, photo })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
