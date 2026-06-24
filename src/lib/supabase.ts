import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// 照片模块类型
export interface PhotoModule {
  id: string
  name: string
  icon: string
  cover?: string
  count: number
  is_system: boolean
  created_at: string
}

// 照片类型
export interface Photo {
  id: string
  url: string
  thumbnail: string
  module_id: string
  tags: string[]
  faces: string[]
  width: number
  height: number
  created_at: string
}

// 默认模块
export const DEFAULT_MODULES: Omit<PhotoModule, 'id' | 'count' | 'created_at'>[] = [
  { name: '全部照片', icon: '📸', is_system: true },
  { name: '人物', icon: '👤', is_system: true },
  { name: '环境', icon: '🌍', is_system: true },
  { name: '游玩', icon: '🎢', is_system: true },
  { name: '任务', icon: '📋', is_system: true },
  { name: '美食', icon: '🍔', is_system: true },
  { name: '动物', icon: '🐱', is_system: true },
  { name: '其他', icon: '🎨', is_system: true },
]

// AI 分类标签
export const CLASSIFICATION_LABELS = [
  '人物', '风景', '建筑', '室内', '自然',
  '旅游', '聚会', '运动', '美食', '动物',
  '截图', '文档', '自拍', '合照', '宠物',
  '夜景', '海边', '山川', '城市', '花卉',
]
