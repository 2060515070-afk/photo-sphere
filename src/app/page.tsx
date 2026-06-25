'use client'

import { useState, useEffect } from 'react'

interface Module {
  id: string
  name: string
  icon: string
  count: number
  is_system: boolean
}

export default function Home() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📁')

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/modules')
      const data = await res.json()
      setModules(data.modules || [])
    } catch {
      console.error('Failed to fetch modules')
    } finally {
      setLoading(false)
    }
  }

  const createModule = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      })
      if (res.ok) {
        setNewName('')
        setNewIcon('📁')
        setShowCreate(false)
        fetchModules()
      }
    } catch {
      console.error('Failed to create module')
    }
  }

  const totalPhotos = modules.reduce((sum, m) => sum + m.count, 0)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '3.5rem', marginBottom: '20px',
            animation: 'float 2s ease-in-out infinite',
          }}>✦</div>
          <p style={{ color: '#8888a0', fontSize: '14px' }}>加载记忆碎片...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 80px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '2.8rem', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: '10px',
          background: 'linear-gradient(135deg, #e8e8ed 0%, #a5b4fc 50%, #8888a0 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          记忆碎片
        </h1>
        <p style={{ color: '#8888a0', fontSize: '14px' }}>
          {totalPhotos > 0 ? `${totalPhotos} 张照片，等待碎片重组` : '上传你的第一张照片，开始构建记忆'}
        </p>
      </div>

      {/* 模块网格 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px', maxWidth: '1100px', margin: '0 auto',
      }}>
        {modules.map((mod, index) => (
          <a
            key={mod.id}
            href={`/module/${mod.id}`}
            className="glass-card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '28px 20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer',
              opacity: 0, animation: `slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards ${index * 0.06}s`,
            }}
          >
            <span className="module-icon">{mod.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 500, marginTop: '10px' }}>{mod.name}</span>
            <span style={{
              fontSize: '12px', color: '#8888a0', marginTop: '4px',
              opacity: mod.count > 0 ? 1 : 0.5,
            }}>
              {mod.count > 0 ? `${mod.count} 张` : '空'}
            </span>
          </a>
        ))}

        {/* 创建模块按钮 */}
        <button
          className="glass-card"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px', cursor: 'pointer',
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8888a0',
            opacity: 0, animation: `slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards ${modules.length * 0.06}s`,
            transition: 'border-color 0.3s, color 0.3s',
          }}
          onClick={() => setShowCreate(true)}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#a5b4fc' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#8888a0' }}
        >
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>+</span>
          <span style={{ fontSize: '13px', marginTop: '8px' }}>创建模块</span>
        </button>
      </div>

      {/* 快速入口 */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px',
        opacity: 0, animation: 'fadeIn 0.6s ease 0.5s forwards',
      }}>
        <a href="/upload" style={{
          padding: '10px 24px', background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px',
          color: '#a5b4fc', textDecoration: 'none', fontSize: '14px',
          transition: 'all 0.2s',
        }}>
          ☁️ 上传照片
        </a>
        <a href="/module/all" style={{
          padding: '10px 24px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
          color: '#8888a0', textDecoration: 'none', fontSize: '14px',
          transition: 'all 0.2s',
        }}>
          🌐 浏览全部
        </a>
      </div>

      {/* 创建模块弹窗 */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0)', animation: 'fadeIn 0.2s ease forwards',
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
            borderRadius: '20px', padding: '32px', width: '380px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            transform: 'scale(0.9)',
            animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>创建新模块</h3>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                value={newIcon}
                onChange={e => setNewIcon(e.target.value)}
                maxLength={2}
                style={{
                  width: '52px', height: '52px', textAlign: 'center', fontSize: '26px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px', color: '#fff', outline: 'none',
                }}
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="模块名称"
                onKeyDown={e => e.key === 'Enter' && createModule()}
                autoFocus
                style={{
                  flex: 1, height: '52px', padding: '0 16px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px', color: '#fff', fontSize: '14px', outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#8888a0', cursor: 'pointer', fontSize: '13px',
                }}
              >
                取消
              </button>
              <button
                onClick={createModule}
                disabled={!newName.trim()}
                style={{
                  padding: '10px 24px',
                  background: newName.trim() ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.2)',
                  border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
