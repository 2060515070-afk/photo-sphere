'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const otherModuleIdRef = useRef('other')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    const uploadFiles: UploadFile[] = arr.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))
    setFiles(prev => [...prev, ...uploadFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadOne = async (i: number) => {
    setFiles(prev => {
      const n = [...prev]; n[i] = { ...n[i], status: 'uploading', progress: 5 }; return n
    })

    try {
      const formData = new FormData()
      formData.append('file', files[i].file)
      formData.append('moduleId', otherModuleIdRef.current)
      const stored = localStorage.getItem('photoSphereUser')
      if (stored) {
        try { formData.append('userId', JSON.parse(stored).id) } catch {}
      }

      setFiles(prev => { const n = [...prev]; n[i] = { ...n[i], progress: 20 }; return n })

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })

      setFiles(prev => { const n = [...prev]; n[i] = { ...n[i], progress: 70 }; return n })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json()
        throw new Error(errData.error || '上传失败')
      }

      setFiles(prev => {
        const n = [...prev]; n[i] = { ...n[i], status: 'done', progress: 100 }; return n
      })
    } catch (err: any) {
      setFiles(prev => {
        const n = [...prev]; n[i] = { ...n[i], status: 'error', error: err.message || '上传失败' }; return n
      })
    }
  }

  const startUpload = async () => {
    setUploading(true)

    // 获取用户的 "其他" 模块 ID
    try {
      const stored = localStorage.getItem('photoSphereUser')
      if (stored) {
        const userId = JSON.parse(stored).id
        const modRes = await fetch(`/api/modules?userId=${userId}`)
        const modData = await modRes.json()
        const otherMod = (modData.modules || []).find((m: any) => m.name === '其他')
        if (otherMod) otherModuleIdRef.current = otherMod.id
      }
    } catch {}

    const CONCURRENCY = 3
    const pending: number[] = []
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'done') pending.push(i)
    }

    // 并发池
    let idx = 0
    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (idx < pending.length) {
        const i = pending[idx++]
        await uploadOne(i)
      }
    })
    await Promise.all(workers)

    setUploading(false)
  }

  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '8px' }}>上传照片</h1>
        <p style={{ color: '#8888a0', fontSize: '14px' }}>支持 JPG、PNG、WebP，支持批量上传</p>
        <a href="/home" style={{ color: '#8888a0', fontSize: '13px', textDecoration: 'none' }}>← 返回空间</a>
      </div>

      {/* 拖拽上传区域 */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{
          padding: '60px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: '24px',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: dragOver ? 'scale(1.01)' : 'scale(1)',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{
          fontSize: '3.5rem', marginBottom: '16px',
          transition: 'transform 0.3s',
          transform: dragOver ? 'translateY(-8px) scale(1.1)' : 'none',
        }}>☁️</div>
        <p style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 500 }}>
          {dragOver ? '松开即可上传' : '拖拽照片到这里，或点击选择'}
        </p>
        <p style={{ fontSize: '13px', color: '#8888a0' }}>
          支持批量上传
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div>
          {/* 操作栏 */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
            padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <span style={{ color: '#8888a0' }}>📁 {files.length} 张</span>
              {doneCount > 0 && <span style={{ color: '#22c55e' }}>✅ {doneCount} 完成</span>}
              {errorCount > 0 && <span style={{ color: '#ef4444' }}>❌ {errorCount} 失败</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { files.forEach(f => URL.revokeObjectURL(f.preview)); setFiles([]) }}
                style={{
                  padding: '8px 16px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  color: '#8888a0', cursor: 'pointer', fontSize: '13px',
                }}
              >
                清空
              </button>
              {doneCount > 0 && (
                <button
                  onClick={() => router.push('/home')}
                  style={{
                    padding: '8px 16px', background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
                    color: '#86efac', cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  查看照片 →
                </button>
              )}
              <button
                onClick={startUpload}
                disabled={uploading || files.every(f => f.status === 'done')}
                style={{
                  padding: '8px 24px',
                  background: uploading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {uploading ? `上传中... (${doneCount}/${files.length})` :
                 files.every(f => f.status === 'done') ? '全部完成' : '开始上传'}
              </button>
            </div>
          </div>

          {/* 文件网格 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px',
          }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1',
                  opacity: 0, animation: `fadeIn 0.3s ease forwards ${i * 0.05}s`,
                }}
              >
                <img
                  src={f.preview}
                  alt=""
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    opacity: f.status === 'uploading' ? 0.5 : 1,
                    filter: f.status === 'error' ? 'grayscale(0.5)' : 'none',
                    transition: 'all 0.3s',
                  }}
                />

                {/* 上传进度条 */}
                {f.status === 'uploading' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
                    background: 'rgba(0,0,0,0.3)',
                  }}>
                    <div style={{
                      height: '100%', width: `${f.progress}%`,
                      background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                    }} />
                  </div>
                )}



                {/* 完成标记 */}
                {f.status === 'done' && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                  }}>✓</div>
                )}

                {/* 错误提示 */}
                {f.status === 'error' && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '6px 8px', background: 'rgba(239,68,68,0.85)',
                    fontSize: '11px', textAlign: 'center',
                    animation: 'slideUp 0.3s ease',
                  }}>
                    {f.error || '上传失败'}
                  </div>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  style={{
                    position: 'absolute', top: '8px', left: '8px',
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', opacity: 0, transition: 'opacity 0.2s',
                  }}
                  className="delete-btn"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        div:hover > .delete-btn { opacity: 1; }
      `}</style>
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  )
}
