'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import PhotoSphere from '@/components/PhotoSphere'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
  file_name?: string
}

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

const COLORS = ['#6366f1','#f43f5e','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#ef4444','#3b82f6','#84cc16','#f97316']

const EMOJI_MAP: Record<string, string> = {
  '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾', '建筑': '🏛️',
  '自然': '🌿', '夜景': '🌙', '海边': '🏖️', '截图': '📱', '花卉': '🌸',
  '宠物': '🐕', '自拍': '🤳',
}
const getEmoji = (tag: string) => EMOJI_MAP[tag] || '📷'

function makeDemoPhotos(): Photo[] {
  const tags = ['风景', '人物', '美食', '动物', '建筑', '自然', '夜景', '海边', '截图', '花卉', '宠物', '自拍']
  // 使用 picsum 真实图片作为测试照片
  return Array.from({ length: 40 }, (_, i) => {
    const seed = i + 10
    return {
      id: `demo-${i}`,
      url: `https://picsum.photos/seed/${seed}/600/600`,
      thumbnail: `https://picsum.photos/seed/${seed}/300/300`,
      tags: [tags[i % tags.length]],
    }
  })
}

export default function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [realPhotos, setRealPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere')
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const [gestureStatus, setGestureStatus] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [viewerAnim, setViewerAnim] = useState<'idle' | 'entering' | 'visible' | 'leaving'>('idle')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 手势数据用 ref — 直接传递给 Three.js，不走 React 状态
  const gestureRotationRef = useRef<{ x: number; y: number } | null>(null)
  const gestureZoomRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handsRef = useRef<any>(null)
  const prevPosRef = useRef<{ x: number; y: number } | null>(null)
  const prevPinchRef = useRef<number | null>(null)
  const animRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const gestureStatusRef = useRef('')

  const moduleInfo = MODULE_NAMES[id] || { name: '自定义模块', icon: '📁' }
  const photos = realPhotos.length > 0 ? realPhotos : makeDemoPhotos()
  const isDemo = realPhotos.length === 0

  useEffect(() => {
    fetch(`/api/photos?moduleId=${id}&limit=200`)
      .then(r => r.json())
      .then(d => setRealPhotos(d.photos || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const openViewer = useCallback((photo: Photo) => {
    setSelectedPhoto(photo)
    setViewerAnim('entering')
    requestAnimationFrame(() => requestAnimationFrame(() => setViewerAnim('visible')))
  }, [])

  const closeViewer = useCallback(() => {
    setViewerAnim('leaving')
    setTimeout(() => { setSelectedPhoto(null); setViewerAnim('idle') }, 300)
  }, [])

  const deletePhoto = async (photoId: string) => {
    if (!confirm('确定要删除这张照片吗？')) return
    setDeleting(photoId)
    try {
      const res = await fetch('/api/photos', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: photoId }),
      })
      if (res.ok) { setRealPhotos(prev => prev.filter(p => p.id !== photoId)); closeViewer() }
    } catch {} finally { setDeleting(null) }
  }

  // ───────── 手势核心 ─────────
  const detectGesture = useCallback((lm: any[]) => {
    // 用「手指弯曲度」判断 —— 比单纯 y 坐标更准
    const curl = (tip: number, dip: number, pip: number, mcp: number) => {
      // 计算指尖到指根的直线距离 vs 指节总长，越小说明越弯曲
      const tipToMcp = Math.hypot(lm[tip].x - lm[mcp].x, lm[tip].y - lm[mcp].y, lm[tip].z - lm[mcp].z)
      const totalLen =
        Math.hypot(lm[tip].x - lm[dip].x, lm[tip].y - lm[dip].y, lm[tip].z - lm[dip].z) +
        Math.hypot(lm[dip].x - lm[pip].x, lm[dip].y - lm[pip].y, lm[dip].z - lm[pip].z) +
        Math.hypot(lm[pip].x - lm[mcp].x, lm[pip].y - lm[mcp].y, lm[pip].z - lm[mcp].z)
      return tipToMcp / (totalLen + 0.001) // 0~1，越小越弯曲
    }

    // 食指(8,6,5,5) 中指(12,10,9,9) 无名指(16,14,13,13) 小指(20,18,17,17)
    const ci = curl(8, 6, 5, 5)
    const cm = curl(12, 10, 9, 9)
    const cr = curl(16, 14, 13, 13)
    const cp = curl(20, 18, 17, 17)
    // 拇指(4,3,2,1)
    const ct = curl(4, 3, 2, 1)

    const fingerUp = (c: number) => c > 0.6  // 弯曲度 > 0.6 算伸直
    const fingerDown = (c: number) => c < 0.45 // 弯曲度 < 0.45 算弯曲

    const iUp = fingerUp(ci), mUp = fingerUp(cm), rUp = fingerUp(cr), pUp = fingerUp(cp)
    const iDown = fingerDown(ci), mDown = fingerDown(cm), rDown = fingerDown(cr), pDown = fingerDown(cp)

    // 捏合：拇指尖(4)和食指尖(8)非常近，且其他手指伸直
    const pinchDist = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y, lm[4].z - lm[8].z)
    if (pinchDist < 0.05 && ct > 0.4) return 'pinch'

    // 张开手掌：全部伸直
    if (iUp && mUp && rUp && pUp) return 'open_palm'

    // 握拳：全部弯曲
    if (iDown && mDown && rDown && pDown) return 'fist'

    // 指向：只有食指伸直
    if (iUp && mDown && rDown && pDown) return 'point'

    return 'none'
  }, [])

  const startGesture = useCallback(async () => {
    try {
      setGestureStatus('正在请求摄像头...')
      gestureStatusRef.current = '正在请求摄像头...'

      // 确保 video 元素存在
      if (!videoRef.current) {
        setGestureStatus('❌ 视频元素未就绪')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      })
      streamRef.current = stream

      // 绑定 stream 到 video
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {})
      }
      // 立即尝试播放
      try { await videoRef.current.play() } catch {}

      setGestureStatus('正在加载手势模型...')

      // 动态加载 MediaPipe
      const { Hands } = await import('@mediapipe/hands')

      // 多 CDN 兜底
      const cdnList = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
        'https://unpkg.com/@mediapipe/hands@0.4.1675469240',
        'https://cdn.bootcdn.net/ajax/libs/mediapipe-hands/0.4.1675469240',
      ]

      let hands: any = null
      for (const cdn of cdnList) {
        try {
          hands = new Hands({ locateFile: (f: string) => `${cdn}/${f}` })
          break
        } catch {}
      }
      if (!hands) {
        hands = new Hands({ locateFile: (f: string) => `${cdnList[0]}/${f}` })
      }

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })

      // 手势回调 — 写入 ref，不触发 React 渲染
      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks?.length) {
          if (gestureStatusRef.current !== '未检测到手') {
            setGestureStatus('未检测到手')
            gestureStatusRef.current = '未检测到手'
          }
          prevPosRef.current = null
          prevPinchRef.current = null
          return
        }

        const lm = results.multiHandLandmarks[0]
        const g = detectGesture(lm)

        if (g === 'open_palm') {
          // 旋转：追踪食指尖(landmark 8)位移（带平滑防抖）
          if (gestureStatusRef.current !== '✋ 旋转中') {
            setGestureStatus('✋ 旋转中')
            gestureStatusRef.current = '✋ 旋转中'
          }
          if (prevPosRef.current) {
            const rawDx = (lm[8].x - prevPosRef.current.x) * 12
            const rawDy = (lm[8].y - prevPosRef.current.y) * 12
            if (Math.abs(rawDx) > 0.003 || Math.abs(rawDy) > 0.003) {
              const smooth = 0.55
              gestureRotationRef.current = { x: rawDx * smooth, y: rawDy * smooth }
            }
          }
          prevPosRef.current = { x: lm[8].x, y: lm[8].y }
          prevPinchRef.current = null
        } else if (g === 'pinch') {
          // 缩放：追踪拇食指间距变化
          if (gestureStatusRef.current !== '🤏 缩放中') {
            setGestureStatus('🤏 缩放中')
            gestureStatusRef.current = '🤏 缩放中'
          }
          const d = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y, lm[4].z - lm[8].z)
          if (prevPinchRef.current !== null) {
            const delta = (d - prevPinchRef.current) * 150
            gestureZoomRef.current = delta
          }
          prevPinchRef.current = d
          prevPosRef.current = null
        } else if (g === 'fist') {
          if (gestureStatusRef.current !== '✊ 暂停') {
            setGestureStatus('✊ 暂停')
            gestureStatusRef.current = '✊ 暂停'
          }
          prevPosRef.current = null
          prevPinchRef.current = null
        } else {
          if (gestureStatusRef.current !== '等待手势...') {
            setGestureStatus('等待手势...')
            gestureStatusRef.current = '等待手势...'
          }
          prevPosRef.current = null
          prevPinchRef.current = null
        }
      })

      handsRef.current = hands
      setGestureEnabled(true)
      setGestureStatus('模型加载中，请稍候...')
      gestureStatusRef.current = '模型加载中...'

      // 逐帧检测循环
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
      } else if (err.name === 'NotFoundError') {
        setGestureStatus('❌ 未找到摄像头')
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
    gestureStatusRef.current = ''
  }, [])

  // 全屏状态监听
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {}
  }, [])

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }, [])

  const getThumb = (photo: Photo) => {
    const url = photo.thumbnail || photo.url || ''
    if (!url) return ''
    // 网格视图用中等缩略图：200x200
    if (url.includes('supabase')) {
      const base = url.split('?')[0].replace('/object/public/', '/render/image/public/')
      return `${base}?width=400&height=400&resize=cover&quality=90`
    }
    return url
  }

  // 查看器动画
  const viewerOverlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: viewerAnim === 'visible' ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0)',
    backdropFilter: viewerAnim === 'visible' ? 'blur(24px)' : 'blur(0px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: viewerAnim === 'visible' ? 'auto' : 'none',
  }
  const viewerContentStyle: React.CSSProperties = {
    position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
    transform: viewerAnim === 'entering' ? 'scale(0.85) translateY(30px)' :
               viewerAnim === 'visible' ? 'scale(1) translateY(0)' :
               viewerAnim === 'leaving' ? 'scale(0.9) translateY(20px)' : 'scale(1)',
    opacity: viewerAnim === 'visible' ? 1 : 0,
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/" style={{ color: '#8888a0', textDecoration: 'none', fontSize: '14px' }}>← 返回</a>
          <span style={{ fontSize: '1.5rem' }}>{moduleInfo.icon}</span>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 600 }}>{moduleInfo.name}</h1>
          <span style={{ fontSize: '13px', color: '#8888a0' }}>{isDemo ? `${photos.length} 演示` : `${photos.length} 张`}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setViewMode('sphere')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'sphere' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'sphere' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>🌐 球形</button>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: viewMode === 'grid' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewMode === 'grid' ? '#a5b4fc' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>▦ 网格</button>
          <button onClick={gestureEnabled ? stopGesture : startGesture} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: gestureEnabled ? 'rgba(34,197,94,0.2)' : 'transparent', color: gestureEnabled ? '#86efac' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>🤚 {gestureEnabled ? '关闭手势' : '手势'}</button>
          <button onClick={toggleFullscreen} style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: isFullscreen ? 'rgba(255,255,255,0.1)' : 'transparent', color: isFullscreen ? '#fff' : '#8888a0', cursor: 'pointer', fontSize: '13px' }}>{isFullscreen ? '✕ 退出全屏' : '⛶ 全屏'}</button>
        </div>
      </div>

      {/* 演示模式提示 */}
      {isDemo && !loading && (
        <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: '#a5b4fc' }}>
          📸 当前为演示模式 · <a href="/upload" style={{ color: '#818cf8' }}>上传真实照片</a> 后将自动显示
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#8888a0' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px', animation: 'float 2s ease-in-out infinite' }}>📷</div>
          <p>加载照片中...</p>
        </div>
      )}

      {/* 内容 */}
      {!loading && (
        viewMode === 'sphere' ? (
          <PhotoSphere
            photos={photos}
            onPhotoClick={openViewer}
            gestureRotationRef={gestureRotationRef}
            gestureZoomRef={gestureZoomRef}
          />
        ) : (
          <div className="photo-grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {photos.map((p, i) => (
              <div key={p.id} className="photo-item" onClick={() => openViewer(p)} style={{
                opacity: 0, animation: `fadeIn 0.4s ease forwards ${i * 0.03}s`,
                background: isDemo ? COLORS[i % COLORS.length] : undefined,
                display: isDemo ? 'flex' : undefined, alignItems: isDemo ? 'center' : undefined,
                justifyContent: isDemo ? 'center' : undefined, fontSize: isDemo ? '2rem' : undefined,
              }}>
                {isDemo ? (
                  <span style={{ fontSize: '2rem' }}>{getEmoji(p.tags[0])}</span>
                ) : (
                  <>
                    <img src={getThumb(p)} alt={p.file_name || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    {p.tags?.length > 0 && <span className="classification-badge">{p.tags[0]}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* 手势摄像头 — 始终存在，通过 CSS 控制显隐 */}
      <video ref={videoRef} playsInline muted style={{
        position: 'fixed', zIndex: gestureEnabled ? 101 : -1,
        bottom: gestureEnabled ? '200px' : '-9999px', right: gestureEnabled ? '20px' : '-9999px',
        width: gestureEnabled ? '160px' : '1px',
        height: gestureEnabled ? '120px' : '1px',
        objectFit: 'cover', transform: 'scaleX(-1)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: gestureEnabled ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
        opacity: gestureEnabled ? 1 : 0,
        transition: 'all 0.3s ease',
      }} />

      {/* 手势状态浮层 */}
      {gestureEnabled && (
        <div style={{
          position: 'fixed', bottom: '200px', right: '20px', zIndex: 102,
          width: '160px', padding: '4px 0',
          background: 'rgba(0,0,0,0.7)', borderRadius: '8px',
          fontSize: '11px', textAlign: 'center', color: '#a5b4fc',
          opacity: 0, animation: 'fadeIn 0.3s ease forwards',
        }}>
          {gestureStatus}
        </div>
      )}

      {/* 照片查看器 */}
      {selectedPhoto && (
        <div style={viewerOverlayStyle} onClick={closeViewer}>
          <div style={viewerContentStyle} onClick={e => e.stopPropagation()}>
            <button onClick={closeViewer} style={{ position: 'absolute', top: '-40px', right: '0', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px' }}>✕</button>
            {!isDemo && (
              <button onClick={() => deletePhoto(selectedPhoto.id)} disabled={deleting === selectedPhoto.id} style={{ position: 'absolute', top: '-40px', left: '0', background: 'rgba(239,68,68,0.5)', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', borderRadius: '8px', padding: '6px 12px' }}>
                {deleting === selectedPhoto.id ? '删除中...' : '🗑️ 删除'}
              </button>
            )}
            {isDemo ? (
              <div style={{ width: '300px', height: '300px', borderRadius: '16px', background: COLORS[parseInt(selectedPhoto.id.split('-')[1]) % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6rem', boxShadow: '0 16px 64px rgba(0,0,0,0.5)' }}>
                {getEmoji(selectedPhoto.tags[0])}
              </div>
            ) : (
              <img src={selectedPhoto.url || getThumb(selectedPhoto)} alt="" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 16px 64px rgba(0,0,0,0.5)' }} />
            )}
            {selectedPhoto.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                {selectedPhoto.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
