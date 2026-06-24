'use client'

import { useState, useEffect } from 'react'

interface Module {
  id: string
  name: string
  icon: string
  count: number
  gradient: string
}

const DEMO_MODULES: Module[] = [
  { id: 'all', name: '全部照片', icon: '📸', count: 0, gradient: 'from-indigo-500/20 to-purple-500/20' },
  { id: 'people', name: '人物', icon: '👤', count: 0, gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: 'environment', name: '环境', icon: '🌍', count: 0, gradient: 'from-emerald-500/20 to-teal-500/20' },
  { id: 'travel', name: '游玩', icon: '🎢', count: 0, gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: 'tasks', name: '任务', icon: '📋', count: 0, gradient: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'food', name: '美食', icon: '🍔', count: 0, gradient: 'from-yellow-500/20 to-amber-500/20' },
  { id: 'animals', name: '动物', icon: '🐱', count: 0, gradient: 'from-violet-500/20 to-fuchsia-500/20' },
  { id: 'other', name: '其他', icon: '🎨', count: 0, gradient: 'from-slate-500/20 to-gray-500/20' },
]

export default function Home() {
  const [modules, setModules] = useState<Module[]>(DEMO_MODULES)
  const [totalPhotos, setTotalPhotos] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // TODO: 从 Supabase 加载模块和照片数量
  }, [])

  if (!mounted) return null

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px' }}>
      {/* 头部统计 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px',
      }}>
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
          {totalPhotos > 0 ? `${totalPhotos} 张照片，等待碎片重组` : '上传你的第一张照片，开始构建记忆空间'}
        </p>
      </div>

      {/* 模块网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {modules.map((mod, index) => (
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
              animationDelay: `${index * 0.05}s`,
              opacity: 0,
              animation: `fadeIn 0.5s ease forwards ${index * 0.05}s`,
            }}
          >
            <span className="module-icon">{mod.icon}</span>
            <span style={{
              fontSize: '16px',
              fontWeight: 500,
              marginTop: '12px',
            }}>
              {mod.name}
            </span>
            <span style={{
              fontSize: '13px',
              color: '#8888a0',
              marginTop: '4px',
            }}>
              {mod.count > 0 ? `${mod.count} 张` : '暂无照片'}
            </span>
          </a>
        ))}

        {/* 添加自定义模块 */}
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
            animation: `fadeIn 0.5s ease forwards ${modules.length * 0.05}s`,
          }}
          onClick={() => {
            const name = prompt('输入模块名称：')
            if (name) {
              const icon = prompt('输入模块图标（emoji）：') || '📁'
              setModules(prev => [...prev, {
                id: `custom-${Date.now()}`,
                name,
                icon,
                count: 0,
                gradient: 'from-gray-500/20 to-slate-500/20',
              }])
            }
          }}
        >
          <span style={{ fontSize: '2rem' }}>+</span>
          <span style={{ fontSize: '14px', marginTop: '8px' }}>创建模块</span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
