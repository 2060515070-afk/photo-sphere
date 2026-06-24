'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import PhotoSphere from '@/components/PhotoSphere'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

// 生成带颜色的 SVG data URI 作为占位图
function makePlaceholder(seed: number, tag: string): string {
  const colors = [
    ['#6366f1', '#818cf8'], ['#f43f5e', '#fb7185'], ['#10b981', '#34d399'],
    ['#f59e0b', '#fbbf24'], ['#8b5cf6', '#a78bfa'], ['#06b6d4', '#22d3ee'],
    ['#ec4899', '#f472b6'], ['#14b8a6', '#2dd4bf'],
  ]
  const [c1, c2] = colors[seed % colors.length]
  const emojis: Record<string, string> = { '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾', '建筑': '🏛️', '自然': '🌿', '夜景': '🌙', '海边': '🏖️' }
  const emoji = emojis[tag] || '📷'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>
    <rect width="400" height="400" fill="url(#g)" rx="12"/>
    <text x="200" y="180" font-size="80" text-anchor="middle" fill="white" opacity="0.9">${emoji}</text>
    <text x="200" y="260" font-size="24" text-anchor="middle" fill="white" opacity="0.7" font-family="sans-serif">${tag}</text>
    <text x="200" y="300" font-size="14" text-anchor="middle" fill="white" opacity="0.4" font-family="sans-serif">#${seed + 1}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// 生成 20 张演示照片
const ALL_PHOTOS: Photo[] = Array.from({ length: 20 }, (_, i) => {
  const tags = ['风景', '人物', '美食', '动物', '建筑', '自然', '夜景', '海边']
  const tag = tags[i % tags.length]
  return {
    id: `photo-${i}`,
    url: makePlaceholder(i, tag),
    thumbnail: makePlaceholder(i, tag),
    tags: [tag],
  }
})

const MODULE_NAMES: Record<string, { name: string; icon: string }> = {
  all: { name: '全部照片', icon: '📸' },
  people: { name: '人物', icon: '👤' },
  environment: { name: '环境', icon: '🌍' },
  travel: { name: '游玩', icon: '🎢' },
  tasks: { name: '任务', icon: '📋' },
  food: { name: '美食', icon: '🍔' },
  animals: { name: '动物', icon: '🐱' },
}

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [photos] = useState<Photo[]>(ALL_PHOTOS)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere')
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const [gestureStatus, setGestureStatus] = useState('')
  const [rotationDelta, setRotationDelta] = useState<{ x: number; y: number } | null>(null)
  const [zoomDelta, setZoomDelta] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const handsRef = useRef<any>(null)
  const prevPosRef = useRef<{ x: number; y: number } | null>(null)
  const prevPinchRef = useRef<number | null>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const moduleInfo = MODULE_NAMES[id] || { name: '自定义模块', icon: '📁' }

  const detectGesture = useCallback((lm: any[]) => {
    const pinch = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y)
    if (pinch < 0.06) return 'pinch'
    const up = (tip: number, mcp: number) => lm[tip].y < lm[mcp].y
    const i = up(8, 5), m = up(12, 9), r = up(16, 13), p = up(20, 17)
    if (i && m && r && p) return 'open_palm'
    if (!i && !m && !r && !p) return 'fist'
    if (i && !m && !r && !p) return 'point'
    return 'none'
  }, [])

  const startGesture = useCallback(async () => {
    try {
      setGestureStatus('正在加载手势模型...')

      const { Hands } = await import('@mediapipe/hands')
      const hands = new Hands({
        locateFile: (file: string) =>
          `https://unpkg.com/@mediapipe/hands@0.4.1675469240/${file}`,
      })

      hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 })

      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks?.length) {
          setGestureStatus('未检测到手')
          prevPosRef.current = null
          prevPinchRef.current = null
          return
        }
        const lm = results.multiHandLandmarks[0]
        const g = detectGesture(lm)

        if (g === 'open_palm') {
          setGestureStatus('✋ 旋转中')
          if (prevPosRef.current) {
            const dx = (lm[8].x - prevPosRef.current.x) * 8
            const dy = (lm[8].y - prevPosRef.current.y) * 8
            if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
              setRotationDelta({ x: dx, y: dy })
              setTimeout(() => setRotationDelta(null), 80)
            }
          }
          prevPosRef.current = { x: lm[8].x, y: lm[8].y }
          prevPinchRef.current = null
        } else if (g === 'pinch') {
          setGestureStatus('🤏 缩放中')
          const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y)
          if (prevPinchRef.current !== null) {
            const delta = (d - prevPinchRef.current) * 25
            if (Math.abs(delta) > 0.01) { setZoomDelta(delta); setTimeout(() => setZoomDelta(null), 80) }
          }
          prevPinchRef.current = d
          prevPosRef.current = null
        } else if (g === 'fist') {
          setGestureStatus('✊ 暂停')
          prevPosRef.current = null; prevPinchRef.current = null
        } else {
          setGestureStatus('等待手势...')
          prevPosRef.current = null; prevPinchRef.current = null
        }
      })

      handsRef.current = hands

      setGestureStatus('请求摄像头权限...')
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }

      setGestureEnabled(true)
      setGestureStatus('摄像头已启动，请伸出手')

      const detect = async () => {
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try { await handsRef.current.send({ image: videoRef.current }) } catch {}
        }
        animRef.current = requestAnimationFrame(detect)
      }
      detect()
    } catch (err: any) {
      console.error('Gesture error:', err)
      setGestureStatus('❌ ' + (err.name === 'NotAllowedError' ? '摄像头权限被拒绝' : err.message || '加载失败'))
    }
  }, [detectGesture])

  const stopGesture = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    handsRef.current = null
    setGestureEnabled(false)
    setGestureStatus('')
  }, [])

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '14px' }}>← 返回</a>
          <span style={{ fontSize: '1.5rem' }}>{moduleInfo.icon}</span>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{moduleInfo.name}</h1>
          <span style={{ fontSize: '13px', color: '#8888a0' }}>{photos.length} 张</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setViewMode('sphere')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'sphere' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'sphere' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>🌐 球形</button>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'grid' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'grid' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>▦ 网格</button>
          <button onClick={gestureEnabled ? stopGesture : startGesture} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: gestureEnabled ? 'rgba(34,197,94,0.2)' : 'transparent', color: gestureEnabled ? '#86efac' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>🤚 {gestureEnabled ? '关闭手势' : '手势'}</button>
        </div>
      </div>

      {/* 内容 */}
      {viewMode === 'sphere' ? (
        <PhotoSphere photos={photos} onPhotoClick={setSelectedPhoto} rotationDelta={rotationDelta} zoomDelta={zoomDelta} />
      ) : (
        <div className="photo-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {photos.map((p) => (
            <div key={p.id} className="photo-item" onClick={() => setSelectedPhoto(p)}>
              <img src={p.thumbnail} alt="" loading="lazy" />
              <span className="classification-badge">{p.tags[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* 手势面板 */}
      {gestureEnabled && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 100 }}>
          <div style={{ width: '160px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} playsInline muted />
            <div style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', padding: '2px 6px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', fontSize: '11px', textAlign: 'center', color: '#a5b4fc' }}>{gestureStatus}</div>
          </div>
        </div>
      )}
      {!gestureEnabled && <video ref={videoRef} style={{ display: 'none' }} playsInline muted />}

      {/* 查看器 */}
      {selectedPhoto && (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative' }}>
            <img src={selectedPhoto.url} alt="" style={{ maxHeight: '85vh' }} />
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'center' }}>
              {selectedPhoto.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
