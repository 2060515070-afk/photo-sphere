-- 照片存储数据库设置

-- 1. 创建模块表
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 创建照片表
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  thumbnail TEXT,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  module_id TEXT DEFAULT 'all',
  tags TEXT[] DEFAULT '{}',
  faces TEXT[] DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_photos_module_id ON photos(module_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING GIN(tags);

-- 4. 创建 Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS 策略（允许公开读取）
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY IF NOT EXISTS "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

-- 6. 插入默认模块
INSERT INTO modules (id, name, icon, is_system) VALUES
  ('all', '全部照片', '📸', true),
  ('people', '人物', '👤', true),
  ('environment', '环境', '🌍', true),
  ('travel', '游玩', '🎢', true),
  ('tasks', '任务', '📋', true),
  ('food', '美食', '🍔', true),
  ('animals', '动物', '🐱', true),
  ('other', '其他', '🎨', true)
ON CONFLICT (id) DO NOTHING;

-- 7. 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
