# 🧩 记忆碎片 - Photo Sphere

3D 照片记忆空间，用漂浮的方式重温每一张照片。

## ✨ 功能

- **3D 球形漂浮** — 照片以记忆碎片的形式漂浮在球形空间中
- **AI 自动分类** — 上传后自动识别照片内容，归入对应模块
- **手势控制** — 通过摄像头识别手势，旋转和缩放照片球
- **多模块管理** — 人物、环境、游玩、美食等分类，支持自定义模块
- **暗黑玻璃态** — 精致的 UI 设计，沉浸式体验

## 🛠️ 技术栈

- **前端：** Next.js 16 + React + TypeScript
- **3D 渲染：** Three.js + React Three Fiber
- **手势识别：** MediaPipe Hands
- **存储：** Supabase Storage + PostgreSQL
- **AI 分类：** 小米 MiMo 视觉模型
- **部署：** Vercel

## 🚀 部署

### 1. Supabase 设置

在 Supabase SQL Editor 中运行 `supabase-setup.sql` 创建数据库表和存储桶。

### 2. 环境变量

在 Vercel 中配置以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
XIAOMI_API_KEY=你的小米 API key
XIAOMI_BASE_URL=https://api.xiaomimimo.com/v1
```

### 3. 部署到 Vercel

```bash
npm i -g vercel
vercel --prod
```

## 📂 项目结构

```
photo-sphere/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页 - 模块卡片
│   │   ├── upload/page.tsx       # 上传页面
│   │   ├── module/[id]/page.tsx  # 模块详情 - 3D 球形
│   │   └── api/
│   │       ├── upload/route.ts   # 上传接口
│   │       ├── photos/route.ts   # 照片 CRUD
│   │       ├── classify/route.ts # AI 分类
│   │       └── modules/route.ts  # 模块管理
│   ├── components/
│   │   ├── PhotoSphere.tsx       # Three.js 3D 球形
│   │   └── GestureDetector.tsx   # 手势识别
│   └── lib/
│       └── supabase.ts           # Supabase 客户端
└── supabase-setup.sql            # 数据库初始化脚本
```

## 🎮 使用

1. 打开首页，查看各分类模块
2. 点击"上传照片"批量上传
3. AI 自动识别并分类照片
4. 进入模块，体验 3D 球形漂浮视图
5. 开启手势控制，用摄像头操控照片球

## 📝 手势说明

| 手势 | 功能 |
|------|------|
| ✋ 张开手掌 | 移动旋转照片球 |
| 🤏 捏合/张开 | 缩放 |
| ✊ 握拳 | 暂停 |
| ☝️ 指向 | 选择照片 |
