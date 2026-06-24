'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  classification?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
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
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const startUpload = async () => {
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue

      setFiles(prev => {
        const newFiles = [...prev]
        newFiles[i] = { ...newFiles[i], status: 'uploading', progress: 0 }
        return newFiles
      })

      try {
        // TODO: 上传到 Supabase Storage
        // 模拟上传进度
        for (let p = 0; p <= 100; p += 20) {
          await new Promise(r => setTimeout(r, 200))
          setFiles(prev => {
            const newFiles = [...prev]
            newFiles[i] = { ...newFiles[i], progress: p }
            return newFiles
          })
        }

        // TODO: 调用 AI 分类 API
        const classification = '其他' // 临时

        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i] = {
            ...newFiles[i],
            status: 'done',
            progress: 100,
            classification,
          }
          return newFiles
        })
      } catch {
        setFiles(prev => {
          const newFiles = [...prev]
          newFiles[i] = { ...newFiles[i], status: 'error' }
          return newFiles
        })
      }
    }

    setUploading(false)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '1.8rem',
        fontWeight: 600,
        marginBottom: '8px',
      }}>
        上传照片
      </h1>
      <p style={{ color: '#8888a0', marginBottom: '32px', fontSize: '14px' }}>
        支持 JPG、PNG、WebP，AI 将自动识别并分类
      </p>

      {/* 拖拽上传区域 */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{
          padding: '60px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '24px',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>☁️</div>
        <p style={{ fontSize: '16px', marginBottom: '8px' }}>
          拖拽照片到这里，或点击选择
        </p>
        <p style={{ fontSize: '13px', color: '#8888a0' }}>
          支持批量上传，AI 自动分类
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '14px', color: '#8888a0' }}>
              {files.length} 张照片
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFiles([])}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#8888a0',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                清空
              </button>
              <button
                onClick={startUpload}
                disabled={uploading}
                style={{
                  padding: '8px 20px',
                  background: uploading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {uploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  aspectRatio: '1',
                }}
              >
                <img
                  src={f.preview}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: f.status === 'uploading' ? 0.6 : 1,
                  }}
                />

                {/* 进度条 */}
                {f.status === 'uploading' && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'rgba(0,0,0,0.3)',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${f.progress}%`,
                      background: '#6366f1',
                      transition: 'width 0.2s',
                    }} />
                  </div>
                )}

                {/* 分类标签 */}
                {f.classification && (
                  <span className="classification-badge">
                    {f.classification}
                  </span>
                )}

                {/* 完成标记 */}
                {f.status === 'done' && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                  }}>
                    ✓
                  </div>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  className="delete-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        div:hover > .delete-btn {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
