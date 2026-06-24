'use client'

import { useState, useEffect } from 'react'
import PhotoSphere from '@/components/PhotoSphere'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

// 真实可用的演示照片
const DEMO_PHOTOS: Photo[] = [
  { id: '1', url: 'https://picsum.photos/seed/a1/800/800', thumbnail: 'https://picsum.photos/seed/a1/400/400', tags: ['风景'] },
  { id: '2', url: 'https://picsum.photos/seed/a2/800/800', thumbnail: 'https://picsum.photos/seed/a2/400/400', tags: ['人物'] },
  { id: '3', url: 'https://picsum.photos/seed/a3/800/800', thumbnail: 'https://picsum.photos/seed/a3/400/400', tags: ['美食'] },
  { id: '4', url: 'https://picsum.photos/seed/a4/800/800', thumbnail: 'https://picsum.photos/seed/a4/400/400', tags: ['动物'] },
  { id: '5', url: 'https://picsum.photos/seed/a5/800/800', thumbnail: 'https://picsum.photos/seed/a5/400/400', tags: ['风景'] },
  { id: '6', url: 'https://picsum.photos/seed/a6/800/800', thumbnail: 'https://picsum.photos/seed/a6/400/400', tags: ['建筑'] },
  { id: '7', url: 'https://picsum.photos/seed/a7/800/800', thumbnail: 'https://picsum.photos/seed/a7/400/400', tags: ['自然'] },
  { id: '8', url: 'https://picsum.photos/seed/a8/800/800', thumbnail: 'https://picsum.photos/seed/a8/400/400', tags: ['人物'] },
  { id: '9', url: 'https://picsum.photos/seed/a9/800/800', thumbnail: 'https://picsum.photos/seed/a9/400/400', tags: ['美食'] },
  { id: '10', url: 'https://picsum.photos/seed/b1/800/800', thumbnail: 'https://picsum.photos/seed/b1/400/400', tags: ['风景'] },
  { id: '11', url: 'https://picsum.photos/seed/b2/800/800', thumbnail: 'https://picsum.photos/seed/b2/400/400', tags: ['动物'] },
  { id: '12', url: 'https://picsum.photos/seed/b3/800/800', thumbnail: 'https://picsum.photos/seed/b3/400/400', tags: ['建筑'] },
  { id: '13', url: 'https://picsum.photos/seed/b4/800/800', thumbnail: 'https://picsum.photos/seed/b4/400/400', tags: ['人物'] },
  { id: '14', url: 'https://picsum.photos/seed/b5/800/800', thumbnail: 'https://picsum.photos/seed/b5/400/400', tags: ['风景'] },
  { id: '15', url: 'https://picsum.photos/seed/b6/800/800', thumbnail: 'https://picsum.photos/seed/b6/400/400', tags: ['美食'] },
  { id: '16', url: 'https://picsum.photos/seed/b7/800/800', thumbnail: 'https://picsum.photos/seed/b7/400/400', tags: ['自然'] },
  { id: '17', url: 'https://picsum.photos/seed/b8/800/800', thumbnail: 'https://picsum.photos/seed/b8/400/400', tags: ['动物'] },
  { id: '18', url: 'https://picsum.photos/seed/b9/800/800', thumbnail: 'https://picsum.photos/seed/b9/400/400', tags: ['建筑'] },
  { id: '19', url: 'https://picsum.photos/seed/c1/800/800', thumbnail: 'https://picsum.photos/seed/c1/400/400', tags: ['风景'] },
  { id: '20', url: 'https://picsum.photos/seed/c2/800/800', thumbnail: 'https://picsum.photos/seed/c2/400/400', tags: ['人物'] },
]

const MODULES = [
  { id: 'all', name: '全部照片', icon: '📸', count: 20 },
  { id: 'people', name: '人物', icon: '👤', count: 5 },
  { id: 'environment', name: '环境', icon: '🌍', count: 6 },
  { id: 'travel', name: '游玩', icon: '🎢', count: 3 },
  { id: 'food', name: '美食', icon: '🍔', count: 3 },
  { id: 'animals', name: '动物', icon: '🐱', count: 3 },
]

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      {/* 头部 */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #e8e8ed 0%, #8888a0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          记忆碎片
        </h1>
        <p style={{ color: '#8888a0', fontSize: '14px' }}>
          20 张照片，等待碎片重组
        </p>
      </div>

      {/* 模块卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {MODULES.map((mod, index) => (
          <a
            key={mod.id}
            href={`/module/${mod.id}`}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 24px',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0,
              animation: `fadeIn 0.5s ease forwards ${index * 0.05}s`,
            }}
          >
            <span className="module-icon">{mod.icon}</span>
            <span style={{ fontSize: '16px', fontWeight: 500, marginTop: '12px' }}>
              {mod.name}
            </span>
            <span style={{ fontSize: '13px', color: '#8888a0', marginTop: '4px' }}>
              {mod.count} 张
            </span>
          </a>
        ))}

        {/* 自定义模块按钮 */}
        <button
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
            cursor: 'pointer',
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'transparent',
            color: '#8888a0',
            opacity: 0,
            animation: `fadeIn 0.5s ease forwards ${MODULES.length * 0.05}s`,
          }}
          onClick={() => alert('自定义模块功能开发中...')}
        >
          <span style={{ fontSize: '2rem' }}>+</span>
          <span style={{ fontSize: '14px', marginTop: '8px' }}>创建模块</span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
