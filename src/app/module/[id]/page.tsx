'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import PhotoSphere from '@/components/PhotoSphere'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

const ALL_PHOTOS: Photo[] = [
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
  const [photos] = useState<Photo[]>(ALL_PHOTOS)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere')
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const [gestureStatus, setGestureStatus] = useState<string>('')
  const [rotationDelta, setRotationDelta] = useState<{ x: number; y: number } | null>(null)
  const [zoomDelta, setZoomDelta] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const handsRef = useRef<any>(null)
  const prevPosRef = useRef<{ x: number; y: number } | null>(null)
  const prevPinchRef = useRef<number | null>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const moduleInfo = MODULE_NAMES[id] || { name: '自定义模块', icon: '📁' }

  // 手势识别
  const detectGesture = useCallback((landmarks: any[]) => {
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    const indexMcp = landmarks[5]
    const middleMcp = landmarks[9]
    const ringMcp = landmarks[13]
    const pinkyMcp = landmarks[17]

    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
    if (pinchDist < 0.06) return 'pinch'

    const indexUp = indexTip.y < indexMcp.y
    const middleUp = middleTip.y < middleMcp.y
    const ringUp = ringTip.y < ringMcp.y
    const pinkyUp = pinkyTip.y < pinkyMcp.y

    if (indexUp && middleUp && ringUp && pinkyUp) return 'open_palm'
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) return 'fist'
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'point'
    return 'none'
  }, [])

  // 启动手势
  const startGesture = useCallback(async () => {
    try {
      setGestureStatus('正在加载手势识别...')

      // 动态导入
      const { Hands } = await import('@mediapipe/hands')

      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })

      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks?.length) {
          setGestureStatus('✋ 未检测到手')
          prevPosRef.current = null
          prevPinchRef.current = null
          return
        }

        const lm = results.multiHandLandmarks[0]
        const g = detectGesture(lm)
        const indexTip = lm[8]
        const thumbTip = lm[4]

        if (g === 'open_palm') {
          setGestureStatus('✋ 旋转中')
          if (prevPosRef.current) {
            const dx = (indexTip.x - prevPosRef.current.x) * 8
            const dy = (indexTip.y - prevPosRef.current.y) * 8
            if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) {
              setRotationDelta({ x: dx, y: dy })
              setTimeout(() => setRotationDelta(null), 80)
            }
          }
          prevPosRef.current = { x: indexTip.x, y: indexTip.y }
          prevPinchRef.current = null
        } else if (g === 'pinch') {
          setGestureStatus('🤏 缩放中')
          const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
          if (prevPinchRef.current !== null) {
            const delta = (dist - prevPinchRef.current) * 25
            if (Math.abs(delta) > 0.01) {
              setZoomDelta(delta)
              setTimeout(() => setZoomDelta(null), 80)
            }
          }
          prevPinchRef.current = dist
          prevPosRef.current = null
        } else if (g === 'fist') {
          setGestureStatus('✊ 暂停')
          prevPosRef.current = null
          prevPinchRef.current = null
        } else if (g === 'point') {
          setGestureStatus('☝️ 指向')
          prevPosRef.current = null
          prevPinchRef.current = null
        } else {
          setGestureStatus('等待手势...')
          prevPosRef.current = null
          prevPinchRef.current = null
        }
      })

      handsRef.current = hands

      // 获取摄像头
      setGestureStatus('正在请求摄像头权限...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setGestureStatus('摄像头已启动，等待手势...')
      setGestureEnabled(true)

      // 逐帧检测
      const detect = async () => {
        if (videoRef.current && handsRef.current && videoRef.current.readyState >= 2) {
          try {
            await handsRef.current.send({ image: videoRef.current })
          } catch (e) {
            // 忽略单帧错误
          }
        }
        animRef.current = requestAnimationFrame(detect)
      }
      detect()

    } catch (err: any) {
      console.error('Gesture error:', err)
      if (err.name === 'NotAllowedError') {
        setGestureStatus('❌ 摄像头权限被拒绝')
      } else if (err.message?.includes('model')) {
        setGestureStatus('❌ 模型加载失败，请检查网络')
      } else {
        setGestureStatus('❌ ' + (err.message || '初始化失败'))
      }
    }
  }, [detectGesture])

  // 停止手势
  const stopGesture = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    handsRef.current = null
    setGestureEnabled(false)
    setGestureStatus('')
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '14px' }}>← 返回</a>
          <span style={{ fontSize: '1.5rem' }}>{moduleInfo.icon}</span>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{moduleInfo.name}</h1>
          <span style={{ fontSize: '13px', color: '#8888a0' }}>{photos.length} 张</span>
        </div>

        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setViewMode('sphere')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'sphere' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'sphere' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>
            🌐 球形
          </button>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'grid' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'grid' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>
            ▦ 网格
          </button>
          <button onClick={gestureEnabled ? stopGesture : startGesture} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: gestureEnabled ? 'rgba(34,197,94,0.2)' : 'transparent', color: gestureEnabled ? '#86efac' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>
            🤚 {gestureEnabled ? '关闭手势' : '手势'}
          </button>
        </div>
      </div>

      {/* 内容 */}
      {viewMode === 'sphere' ? (
        <PhotoSphere photos={photos} onPhotoClick={setSelectedPhoto} rotationDelta={rotationDelta} zoomDelta={zoomDelta} />
      ) : (
        <div className="photo-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {photos.map((photo) => (
            <div key={photo.id} className="photo-item" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.thumbnail} alt="" loading="lazy" />
              {photo.tags.length > 0 && <span className="classification-badge">{photo.tags[0]}</span>}
            </div>
          ))}
        </div>
      )}

      {/* 手势控制面板 */}
      {gestureEnabled && (
        <div style={{ position: 'fixed', bottom: '80px', right: '20px', zIndex: 100 }}>
          <div style={{ width: '160px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', position: 'relative' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} playsInline muted />
            <div style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', padding: '2px 6px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', fontSize: '11px', textAlign: 'center', backdropFilter: 'blur(4px)', color: '#a5b4fc' }}>
              {gestureStatus || '等待手势...'}
            </div>
          </div>
        </div>
      )}

      {/* 非手势模式也显示 video 引用（隐藏） */}
      {!gestureEnabled && <video ref={videoRef} style={{ display: 'none' }} playsInline muted />}

      {/* 照片查看器 */}
      {selectedPhoto && (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)}>
          <div style={{ position: 'relative' }}>
            <img src={selectedPhoto.url} alt="" style={{ maxHeight: '85vh' }} />
            <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>✕</button>
            {selectedPhoto.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'center' }}>
                {selectedPhoto.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
