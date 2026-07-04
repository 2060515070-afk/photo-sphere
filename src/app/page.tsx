'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  icon: string
  photoCount: number
  created_at: string
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showPassword, setShowPassword] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIcon, setNewIcon] = useState('📷')
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [step, setStep] = useState<'master' | 'setup'>('master')

  useEffect(() => {
    // 模拟加载进度
    let progress = 0
    const timer = setInterval(() => {
      progress += Math.random() * 15 + 5
      if (progress >= 100) {
        progress = 100
        clearInterval(timer)
      }
      setLoadingProgress(progress)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      console.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const verifyPassword = async () => {
    if (!showPassword || !password.trim()) return
    setVerifying(true)
    setPasswordError('')
    try {
      const res = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: showPassword, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('photoSphereUser', JSON.stringify({ id: data.user.id, name: data.user.name }))
        window.location.href = '/user/' + data.user.id
      } else {
        setPasswordError(data.error || '密码错误')
      }
    } catch {
      setPasswordError('验证失败')
    } finally {
      setVerifying(false)
    }
  }

  const handleCreateStep1 = () => {
    if (masterPassword.trim()) {
      setStep('setup')
      setCreateError('')
    }
  }

  const handleCreate = async () => {
    if (!newName.trim() || !newPassword.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword,
          name: newName.trim(),
          password: newPassword.trim(),
          icon: newIcon,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setMasterPassword('')
        setNewName('')
        setNewPassword('')
        setNewIcon('📷')
        setStep('master')
        fetchUsers()
      } else {
        setCreateError(data.error || '创建失败')
      }
    } catch {
      setCreateError('创建失败')
    } finally {
      setCreating(false)
    }
  }

  // 加载中
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }}>
        <div style={{
          fontSize: '3.5rem', marginBottom: '20px',
          animation: 'float 2s ease-in-out infinite',
        }}>✦</div>
        <p style={{ color: '#8888a0', fontSize: '14px', marginBottom: '20px' }}>加载记忆碎片...</p>
        {/* 进度条 */}
        <div style={{
          width: '200px', height: '3px', borderRadius: '2px',
          background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${loadingProgress}%`, height: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
            transition: 'width 0.2s ease',
          }} />
        </div>
        <p style={{ color: '#555', fontSize: '11px', marginTop: '8px' }}>{Math.round(loadingProgress)}%</p>
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
          选择一个空间，输入密码进入
        </p>
      </div>

      {/* 用户卡片网格 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px', maxWidth: '1100px', margin: '0 auto',
      }}>
        {users.map((user, index) => (
          <button
            key={user.id}
            className="glass-card"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '28px 20px', cursor: 'pointer', border: 'none', color: 'inherit',
              opacity: 0, animation: `slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards ${index * 0.06}s`,
            }}
            onClick={() => { setShowPassword(user.id); setPassword(''); setPasswordError('') }}
          >
            <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{user.icon}</span>
            <span style={{ fontSize: '15px', fontWeight: 500, marginTop: '6px' }}>{user.name}</span>
            <span style={{ fontSize: '12px', color: '#8888a0', marginTop: '4px' }}>
              {user.photoCount > 0 ? `${user.photoCount} 张照片` : '空'}
            </span>
            <span style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5 }}>🔒</span>
          </button>
        ))}

        {/* 创建新空间按钮 */}
        <button
          className="glass-card"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px', cursor: 'pointer',
            border: '1px dashed rgba(255,255,255,0.1)',
            background: 'transparent', color: '#8888a0',
            opacity: 0, animation: `slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards ${users.length * 0.06}s`,
            transition: 'border-color 0.3s, color 0.3s',
          }}
          onClick={() => { setShowCreate(true); setStep('master'); setMasterPassword(''); setCreateError('') }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = '#a5b4fc' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#8888a0' }}
        >
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>+</span>
          <span style={{ fontSize: '13px', marginTop: '8px' }}>创建新空间</span>
        </button>
      </div>

      {/* 密码验证弹窗 */}
      {showPassword && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0)', animation: 'fadeIn 0.2s ease forwards',
        }} onClick={() => setShowPassword(null)}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
            borderRadius: '20px', padding: '32px', width: '360px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            transform: 'scale(0.9)',
            animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
              {users.find(u => u.id === showPassword)?.icon} {users.find(u => u.id === showPassword)?.name}
            </h3>
            <p style={{ color: '#8888a0', fontSize: '13px', marginBottom: '20px' }}>输入密码进入空间</p>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError('') }}
              placeholder="请输入密码"
              onKeyDown={e => e.key === 'Enter' && verifyPassword()}
              autoFocus
              style={{
                width: '100%', height: '48px', padding: '0 16px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none',
                marginBottom: '12px',
              }}
            />
            {passwordError && (
              <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{passwordError}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPassword(null)}
                style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#8888a0', cursor: 'pointer', fontSize: '13px',
                }}
              >
                取消
              </button>
              <button
                onClick={verifyPassword}
                disabled={!password.trim() || verifying}
                style={{
                  padding: '10px 24px',
                  background: password.trim() ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.2)',
                  border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                }}
              >
                {verifying ? '验证中...' : '进入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 创建新空间弹窗 */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0)', animation: 'fadeIn 0.2s ease forwards',
        }} onClick={() => { setShowCreate(false); setStep('master') }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
            borderRadius: '20px', padding: '32px', width: '400px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            transform: 'scale(0.9)',
            animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }} onClick={e => e.stopPropagation()}>
            {step === 'master' ? (
              <>
                <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>🔐 验证管理员</h3>
                <p style={{ color: '#8888a0', fontSize: '13px', marginBottom: '20px' }}>输入总管理密码以创建新空间</p>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={e => { setMasterPassword(e.target.value); setCreateError('') }}
                  placeholder="总管理密码"
                  onKeyDown={e => e.key === 'Enter' && handleCreateStep1()}
                  autoFocus
                  style={{
                    width: '100%', height: '48px', padding: '0 16px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none',
                    marginBottom: '12px',
                  }}
                />
                {createError && (
                  <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{createError}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setShowCreate(false); setStep('master') }}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8888a0', cursor: 'pointer', fontSize: '13px' }}>
                    取消
                  </button>
                  <button onClick={handleCreateStep1} disabled={!masterPassword.trim()}
                    style={{ padding: '10px 24px', background: masterPassword.trim() ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    下一步
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>✨ 创建新空间</h3>
                <p style={{ color: '#8888a0', fontSize: '13px', marginBottom: '20px' }}>设置空间名称和进入密码</p>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input value={newIcon} onChange={e => setNewIcon(e.target.value)} maxLength={2}
                    style={{ width: '48px', height: '48px', textAlign: 'center', fontSize: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="空间名称" autoFocus
                    style={{ flex: 1, height: '48px', padding: '0 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                </div>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="设置进入密码" onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  style={{ width: '100%', height: '48px', padding: '0 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }} />
                {createError && (
                  <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>{createError}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setStep('master')}
                    style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#8888a0', cursor: 'pointer', fontSize: '13px' }}>
                    返回
                  </button>
                  <button onClick={handleCreate} disabled={!newName.trim() || !newPassword.trim() || creating}
                    style={{ padding: '10px 24px', background: (newName.trim() && newPassword.trim()) ? 'rgba(99,102,241,0.8)' : 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                    {creating ? '创建中...' : '创建'}
                  </button>
                </div>
              </>
            )}
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
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
