import { NextRequest, NextResponse } from 'next/server'

const XIAOMI_API_KEY = process.env.XIAOMI_API_KEY!
const XIAOMI_BASE_URL = process.env.XIAOMI_BASE_URL!

const CATEGORIES = [
  { id: 'people', label: '人物', keywords: ['人', '脸', '自拍', '合照', '肖像'] },
  { id: 'environment', label: '环境', keywords: ['风景', '建筑', '自然', '天空', '山', '海', '湖', '树', '花'] },
  { id: 'travel', label: '游玩', keywords: ['旅游', '景点', '游乐', '运动', '户外', '沙滩', '公园'] },
  { id: 'tasks', label: '任务', keywords: ['截图', '文档', '屏幕', '文字', '表格', '代码'] },
  { id: 'food', label: '美食', keywords: ['食物', '餐厅', '饭菜', '水果', '饮料', '甜点'] },
  { id: 'animals', label: '动物', keywords: ['猫', '狗', '鸟', '宠物', '动物', '鱼'] },
  { id: 'other', label: '其他', keywords: [] },
]

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片 URL' }, { status: 400 })
    }

    // 调用小米视觉模型进行分类
    const response = await fetch(`${XIAOMI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XIAOMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: [
          {
            role: 'system',
            content: `你是一个图片分类助手。请根据图片内容，从以下类别中选择最匹配的一个：
${CATEGORIES.map(c => `- ${c.label}（${c.keywords.join('、')}）`).join('\n')}

只返回类别名称，不要返回其他内容。`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
              {
                type: 'text',
                text: '请对这张图片进行分类。',
              },
            ],
          },
        ],
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      console.error('AI API error:', response.status)
      // 降级：返回默认分类
      return NextResponse.json({
        category: 'other',
        label: '其他',
        confidence: 0,
      })
    }

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content?.trim() || '其他'

    // 匹配分类
    const matched = CATEGORIES.find(c =>
      result.includes(c.label)
    ) || CATEGORIES[CATEGORIES.length - 1]

    return NextResponse.json({
      category: matched.id,
      label: matched.label,
      confidence: matched.id === 'other' ? 0.3 : 0.8,
    })
  } catch (err) {
    console.error('Classify error:', err)
    return NextResponse.json({
      category: 'other',
      label: '其他',
      confidence: 0,
    })
  }
}
