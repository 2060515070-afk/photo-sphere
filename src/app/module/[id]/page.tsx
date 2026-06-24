'use client'

import { useState, useEffect, use } from 'react'
import PhotoSphere from '@/components/PhotoSphere'
import GestureDetector from '@/components/GestureDetector'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

// 演示用照片数据
const DEMO_PHOTOS: Photo[] = Array.from({ length: 24 }, (_, i) => ({
  id: `photo-${i}`,
  url: `https://picsum.photos/seed/${i + 10}/800/800`,
  thumbnail: `https://picsum.photos/seed/${i + 10}/400/400`,
  tags: ['风景', '人物', '美食', '动物'][i % 4] ? [['风景', '人物', '美食', '动物'][i % 4]] : [],
}))

const MODULE_NAMES: Record<string, { name: string; icon: string }> = {
  all: { name: '全部照片', icon: '📸' },
  people: { name: '人物', icon: '👤' },
  environment: { name: '环境', icon: '🌍' },
  travel: { name: '游玩', icon: '🎢' },
  tasks: { name: '任务', icon: '📋' },
  food: { name: '美食', icon: '🍔' },
  animals: { name: '动物', icon: '🐱' },
  other: { name: '其他', icon: '🎨' },
}

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere')
  const [loading, setLoading] = useState(true)
  const [gestureEnabled, setGestureEnabled] = useState(false)

  const moduleInfo = MODULE_NAMES[id] || { name: '自定义模块', icon: '📁' }

  useEffect(() => {
    // TODO: 从 Supabase 加载该模块的照片
    // 暂时用演示数据
    setTimeout(() => {
      setPhotos(DEMO_PHOTOS)
      setLoading(false)
    }, 500)
  }, [id])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 模块头部 */}
      <div style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="/"
            style={{
              color: '#8888a0',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            ← 返回
          </a>
          <span style={{ fontSize: '1.5rem' }}>{moduleInfo.icon}</span>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{moduleInfo.name}</h1>
          <span style={{ fontSize: '13px', color: '#8888a0' }}>
            {photos.length} 张
          </span>
        </div>

        {/* 视图切换 */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={() => setViewMode('sphere')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'sphere' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'sphere' ? '#a5b4fc' : '#8888a0',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🌐 球形
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'grid' ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: viewMode === 'grid' ? '#a5b4fc' : '#8888a0',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ▦ 网格
          </button>
          <button
            onClick={() => setGestureEnabled(!gestureEnabled)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: gestureEnabled ? 'rgba(34,197,94,0.2)' : 'transparent',
              color: gestureEnabled ? '#86efac' : '#8888a0',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            🤚 手势
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          color: '#8888a0',
        }}>
          <div className="animate-float" style={{ fontSize: '2rem' }}>✦</div>
        </div>
      ) : viewMode === 'sphere' ? (
        <PhotoSphere
          photos={photos}
          onPhotoClick={setSelectedPhoto}
        />
      ) : (
        <div className="photo-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.thumbnail} alt="" loading="lazy" />
              {photo.tags.length > 0 && (
                <span className="classification-badge">
                  {photo.tags[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 手势控制 */}
      <GestureDetector
        enabled={gestureEnabled}
        onRotate={(dx, dy) => {
          // TODO: 控制 Three.js 场景旋转
          console.log('rotate', dx, dy)
        }}
        onZoom={(delta) => {
          // TODO: 控制 Three.js 场景缩放
          console.log('zoom', delta)
        }}
      />

      {/* 照片查看器 */}
      {selectedPhoto && (
        <div
          className="photo-viewer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={selectedPhoto.url}
              alt=""
              style={{ maxHeight: '85vh' }}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: 0,
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
            {/* 照片标签 */}
            {selectedPhoto.tags.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '6px',
                marginTop: '12px',
                justifyContent: 'center',
              }}>
                {selectedPhoto.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
