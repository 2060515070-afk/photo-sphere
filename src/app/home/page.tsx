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
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem('photoSphereUser')
    if (!stored) {
      window.location.href = '/'
      return
    }
    try {
      const user = JSON.parse(stored)
      setUserId(user.id)
      setUserName(user.name)
    } catch {
      window.location.href = '/'
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let progress = 0
    const timer = setInterval(() => {
      progress += Math.random() * 20 + 10
      if (progress >= 100) { progress = 100; clearInterval(timer) }
      setLoadingProgress(progress)
    }, 80)
    fetchModules()
    return () => clearInterval(timer)
  }, [userId])

  const fetchModules = async () => {
    try {
      const res = await fetch(`/api/modules?userId=${userId}`)
      const data = await res.json()
      setModules(data.modules || [])
    } catch {
      console.error('Failed to fetch modules')
    } finally {
      setLoading(false)
    }
  }

  const totalPhotos = modules.reduce((sum, m) => sum + m.count, 0)

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '20px', animation: 'float 2s ease-in-out infinite' }}>✦</div>
        <p style={{ color: '#8888a0', fontSize: '14px', marginBottom: '20px' }}>加载 {userName} 的空间...</p>
        <div style={{ width: '200px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{ width: `${loadingProgress}%`, height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #6366f1, #a5b4fc)', transition: 'width 0.15s ease' }} />
        </div>
        <p style={{ color: '#555', fontSize: '11px', marginTop: '8px' }}>{Math.round(loadingProgress)}%</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <a href="/" onClick={() => localStorage.removeItem('photoSphereUser')} style={{ color: '#8888a0', fontSize: '13px', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← 退出空间</a>
        <h1 style={{
          fontSize: '2.8rem', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: '10px',
          background: 'linear-gradient(135deg, #e8e8ed 0%, #a5b4fc 50%, #8888a0 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {userName || '记忆碎片'}
        </h1>
        <p style={{ color: '#8888a0', fontSize: '14px' }}>
          {totalPhotos > 0 ? `${totalPhotos} 张照片` : '上传你的第一张照片'}
        </p>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px', maxWidth: '1100px', margin: '0 auto',
      }}>
        {modules.map((mod, index) => {
          const isAll = index === 0 && mod.is_system
          const href = isAll ? `/user/${userId}/module/all` : `/user/${userId}/module/${mod.id}`
          return (
          <a key={mod.id} href={href} className="glass-card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '28px 20px', textDecoration: 'none', color: 'inherit', cursor: 'pointer',
              opacity: 0, animation: `slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards ${index * 0.06}s`,
            }}>
            <span className="module-icon">{mod.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 500, marginTop: '10px' }}>{mod.name}</span>
            <span style={{ fontSize: '12px', color: '#8888a0', marginTop: '4px', opacity: mod.count > 0 ? 1 : 0.5 }}>
              {mod.count > 0 ? `${mod.count} 张` : '空'}
            </span>
          </a>
        )})}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '40px',
        opacity: 0, animation: 'fadeIn 0.6s ease 0.5s forwards',
      }}>
        <a href="/upload" style={{
          padding: '10px 24px', background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px',
          color: '#a5b4fc', textDecoration: 'none', fontSize: '14px',
        }}>☁️ 上传照片</a>
      </div>

      <style jsx global>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  )
}
