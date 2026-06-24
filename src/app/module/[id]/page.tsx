'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import PhotoSphere from '@/components/PhotoSphere'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

// 生成 20 张演示照片（纯色卡 + emoji）
function makePhotos(): Photo[] {
  const tags = ['风景', '人物', '美食', '动物', '建筑', '自然', '夜景', '海边']
  return Array.from({ length: 20 }, (_, i) => {
    const tag = tags[i % tags.length]
    return { id: `p-${i}`, url: '', thumbnail: '', tags: [tag] }
  })
}

const ALL_PHOTOS = makePhotos()

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
      setGestureStatus('正在请求摄像头...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setGestureStatus('正在加载手势模型...')

      // 加载 MediaPipe（多重 CDN 兜底）
      const cdnBases = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
        'https://unpkg.com/@mediapipe/hands@0.4.1675469240',
        'https://cdn.bootcdn.net/ajax/libs/mediapipe-hands/0.4.1675469240',
        'https://fastly.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
      ]

      const { Hands } = await import('@mediapipe/hands')

      // 尝试每个 CDN
      let hands: any = null
      for (const base of cdnBases) {
        try {
          hands = new Hands({ locateFile: (file: string) => `${base}/${file}` })
          break
        } catch {}
      }

      if (!hands) {
        hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        })
      }

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })

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
            if (Math.abs(delta) > 0.01) {
              setZoomDelta(delta)
              setTimeout(() => setZoomDelta(null), 80)
            }
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
      setGestureEnabled(true)
      setGestureStatus('模型加载中，请稍候...')

      // 逐帧检测
      const detect = async () => {
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try { await handsRef.current.send({ image: videoRef.current }) } catch {}
        }
        animRef.current = requestAnimationFrame(detect)
      }
      detect()

    } catch (err: any) {
      console.error('Gesture error:', err)
      if (err.name === 'NotAllowedError') {
        setGestureStatus('❌ 摄像头权限被拒绝')
      } else {
        setGestureStatus('❌ ' + (err.message || '加载失败'))
      }
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
          {photos.map((p, i) => (
            <div key={p.id} className="photo-item" onClick={() => setSelectedPhoto(p)} style={{ background: ['#6366f1','#f43f5e','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6'][i % 8], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              {{ '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾', '建筑': '🏛️', '自然': '🌿', '夜景': '🌙', '海边': '🏖️' }[p.tags[0]] || '📷'}
            </div>
          ))}
        </div>
      )}

      {/* 手势面板 */}
      {gestureEnabled && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 100 }}>
          <div style={{ width: '160px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} playsInline muted />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', padding: '2px 6px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', fontSize: '11px', textAlign: 'center', color: '#a5b4fc' }}>{gestureStatus}</div>
          </div>
        </div>
      )}
      {!gestureEnabled && <video ref={videoRef} style={{ display: 'none' }} playsInline muted />}

      {/* 查看器 */}
      {selectedPhoto && (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative', padding: '40px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            <div style={{ textAlign: 'center', fontSize: '4rem', marginBottom: '16px' }}>
              {{ '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾', '建筑': '🏛️', '自然': '🌿', '夜景': '🌙', '海边': '🏖️' }[selectedPhoto.tags[0]] || '📷'}
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
              {selectedPhoto.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
