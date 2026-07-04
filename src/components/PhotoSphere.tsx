'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
  file_name?: string
}

interface PhotoSphereProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
  gestureRotationRef?: React.MutableRefObject<{ x: number; y: number } | null>
  gestureZoomRef?: React.MutableRefObject<number | null>
}

// ─── 弥散球形分布 ───
function diffuseSphere(n: number, radius: number) {
  const phi = (1 + Math.sqrt(5)) / 2
  const points: { x: number; y: number; z: number }[] = []

  for (let i = 0; i < n; i++) {
    const z = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - z * z)
    const theta = (2 * Math.PI * i) / phi

    let x = r * Math.cos(theta)
    let y = r * Math.sin(theta)
    let zz = z

    // 弥散偏移
    const spread = 0.3
    x += gauss() * spread
    y += gauss() * spread
    zz += gauss() * spread

    const len = Math.sqrt(x * x + y * y + zz * zz)
    if (len > 0) { x /= len; y /= len; zz /= len }

    const shell = 0.88 + Math.random() * 0.24
    points.push({
      x: radius * shell * x,
      y: radius * shell * y,
      z: radius * shell * zz,
    })
  }
  return points
}

function gauss() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const EMOJI_MAP: Record<string, string> = {
  '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾', '建筑': '🏛️',
  '自然': '🌿', '夜景': '🌙', '海边': '🏖️', '截图': '📱', '文档': '📄',
  '自拍': '🤳', '合照': '👥', '宠物': '🐕', '花卉': '🌸',
}
const getEmoji = (tag: string) => EMOJI_MAP[tag] || '📷'

export default function PhotoSphere({
  photos,
  onPhotoClick,
  gestureRotationRef,
  gestureZoomRef,
}: PhotoSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const rot = useRef({ x: -15, y: 0 })
  const targetRot = useRef({ x: -15, y: 0 })
  const autoSpeed = useRef(0.1)
  const dist = useRef(550)
  const targetDist = useRef(550)
  const frameRef = useRef(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const frameCount = useRef(0)

  // 背景粒子数据（静止）
  const particles = useMemo(() => {
    const colors = [
      'rgba(129,140,255,0.9)', 'rgba(167,139,250,0.75)', 'rgba(244,114,182,0.6)',
      'rgba(96,165,250,0.75)', 'rgba(52,211,153,0.6)', 'rgba(255,255,255,0.35)',
    ]
    return Array.from({ length: 300 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.7,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      color: colors[i % colors.length],
    }))
  }, [])

  // 照片数量
  const MAX = 80
  const displayPhotos = useMemo(() => photos.slice(0, MAX), [photos])
  const radius = useMemo(() => Math.max(200, Math.min(380, 15 * Math.sqrt(displayPhotos.length))), [displayPhotos.length])
  const positions = useMemo(() => diffuseSphere(displayPhotos.length, radius), [displayPhotos.length, radius])

  // 散在球体周围的银白粒子（跟随旋转）
  const orbitParticles = useMemo(() => {
    const orbitR = radius * 1.8
    return Array.from({ length: 100 }, (_, i) => {
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = 2 * Math.PI * Math.random()
      const r = orbitR * (0.6 + Math.random() * 0.4)
      return {
        id: i,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.4 + Math.random() * 0.6,
        delay: Math.random() * 4,
      }
    })
  }, [radius])

  // 预生成每张照片的固定尺寸和透明度（不随帧变化）
  const photoMeta = useMemo(() =>
    displayPhotos.map(() => ({
      size: 52 + Math.floor(Math.random() * 24),
      opacity: 1,
    })),
    [displayPhotos.length]
  )

  const getThumbUrl = useCallback((photo: Photo) => {
    let url = photo.thumbnail || photo.url
    if (!url) return ''
    if (url.includes('supabase')) {
      // Supabase 图片变换必须用 /render/image/ 路径
      const base = url.split('?')[0].replace('/object/public/', '/render/image/public/')
      return `${base}?width=400&height=400&resize=cover&quality=90`
    }
    return url
  }, [])

  // 动画循环：只更新 2 个 CSS 变量，零 DOM 查询
  useEffect(() => {
    let lastTime = performance.now()

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now

      if (gestureRotationRef?.current) {
        targetRot.current.y += gestureRotationRef.current.x * 300
        targetRot.current.x += gestureRotationRef.current.y * 300
        targetRot.current.x = Math.max(-89, Math.min(89, targetRot.current.x))
        gestureRotationRef.current = null
        autoSpeed.current = 0
      }

      if (gestureZoomRef?.current) {
        targetDist.current -= gestureZoomRef.current * 300
        targetDist.current = Math.max(200, Math.min(1000, targetDist.current))
        gestureZoomRef.current = null
      }

      if (!isDragging.current) {
        targetRot.current.y += autoSpeed.current * dt
        autoSpeed.current = Math.min(0.1, autoSpeed.current + 0.0005 * dt)
      }

      const ease = 0.08 * dt
      rot.current.x += (targetRot.current.x - rot.current.x) * ease
      rot.current.y += (targetRot.current.y - rot.current.y) * ease
      dist.current += (targetDist.current - dist.current) * ease

      // 每 2 帧更新一次 DOM（减少 50% 开销）
      frameCount.current++
      if (frameCount.current % 2 === 0) {
        const el = innerRef.current
        if (el) {
          el.style.transform = `rotateX(${rot.current.x}deg) rotateY(${rot.current.y}deg)`
          // 反向旋转让照片面向摄像机
          el.style.setProperty('--crx', `${-rot.current.x}deg`)
          el.style.setProperty('--cry', `${-rot.current.y}deg`)

        }
        const container = containerRef.current
        if (container) {
          container.style.perspective = `${dist.current}px`
        }
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [gestureRotationRef, gestureZoomRef])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    autoSpeed.current = 0
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    targetRot.current.y += (e.clientX - lastPos.current.x) * 0.4
    targetRot.current.x -= (e.clientY - lastPos.current.y) * 0.4
    targetRot.current.x = Math.max(-89, Math.min(89, targetRot.current.x))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback(() => { isDragging.current = false }, [])

  // 用原生事件监听器替代 React onWheel（passive 无法 preventDefault）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      targetDist.current += e.deltaY * 0.8
      targetDist.current = Math.max(200, Math.min(1000, targetDist.current))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8888a0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌐</div>
        <p>没有照片可以展示</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="sphere-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}

      style={{
        cursor: isDragging.current ? 'grabbing' : 'grab',
        perspective: '550px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      {/* 弥散光晕 */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.05) 0%, transparent 60%)',
      }} />

      {/* 背景粒子 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((p) => (
          <div key={p.id} style={{
            position: 'absolute',
            left: `${p.x}%`, top: `${p.y}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${p.color}, transparent)`,
            opacity: p.opacity,
            animation: `particle-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* 旋转容器 */}
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          width: 0, height: 0,
          transformStyle: 'preserve-3d',
          transform: 'rotateX(-15deg) rotateY(0deg)',
          '--crx': '15deg',
          '--cry': '0deg',
        } as React.CSSProperties}
      >
        {displayPhotos.map((photo, i) => {
          const pos = positions[i]
          const meta = photoMeta[i]
          if (!pos || !meta) return null
          const tag = photo.tags?.[0] || ''
          const isHovered = hoveredId === photo.id
          const s = meta.size

          return (
            <div
              key={photo.id}
              className="sphere-photo"
              style={{
                position: 'absolute',
                width: `${s}px`, height: `${s}px`,
                left: `${-s / 2}px`, top: `${-s / 2}px`,
                borderRadius: '10px',
                overflow: 'hidden',
                cursor: 'pointer',
                // 核心：translate3d 定位 + CSS变量反向旋转 = 始终面向摄像机
                transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateY(var(--cry)) rotateX(var(--crx))`,
                opacity: meta.opacity,
                transition: 'box-shadow 0.3s',
                boxShadow: isHovered
                  ? '0 0 24px rgba(99,102,241,0.8)'
                  : '0 2px 12px rgba(0,0,0,0.4)',
                zIndex: isHovered ? 100 : 1,
                backfaceVisibility: 'hidden',
              }}
              onClick={(e) => { e.stopPropagation(); onPhotoClick?.(photo) }}
              onPointerEnter={() => setHoveredId(photo.id)}
              onPointerLeave={() => setHoveredId(null)}
            >
              {/* 占位符 - 图片加载前显示 */}
              <div
                className="sphere-photo-placeholder"
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, #1a1a2e, #16162a)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}
              >
                {getEmoji(tag)}
              </div>
              <img
                src={getThumbUrl(photo)}
                alt=""
                loading="lazy"
                decoding="async"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', pointerEvents: 'none', borderRadius: '10px',
                  position: 'relative', zIndex: 1,
                }}
                onLoad={(e) => {
                  // 加载成功后隐藏占位符
                  const p = (e.target as HTMLImageElement).parentElement
                  const fb = p?.querySelector('.sphere-photo-placeholder') as HTMLElement
                  if (fb) fb.style.display = 'none'
                }}
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = 'none'
                }}
              />
              {isHovered && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '10px',
                  border: '2px solid rgba(99,102,241,0.5)', pointerEvents: 'none',
                }} />
              )}
            </div>
          )
        })}

        {/* 银白环绕粒子 */}
        {orbitParticles.map((p) => (
          <div key={`orbit-${p.id}`} style={{
            position: 'absolute',
            width: `${p.size}px`, height: `${p.size}px`,
            left: `${-p.size / 2}px`, top: `${-p.size / 2}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(200,210,255,0.3))',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
            transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateY(var(--cry)) rotateX(var(--crx))`,
            opacity: p.opacity,
            pointerEvents: 'none',
            backfaceVisibility: 'hidden',
            animation: `particle-float ${3 + p.delay}s ease-in-out ${p.delay}s infinite alternate`,
          }} />
        ))}
      </div>

      <div className="gesture-indicator">
        🖱️ 拖拽旋转 · 滚轮缩放 · 点击查看 · {displayPhotos.length}/{photos.length} 张
      </div>

      <style jsx global>{`
        .sphere-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: calc(100vh - 80px);
          position: relative;
          overflow: hidden;
          touch-action: none;
        }
        .sphere-photo {
          will-change: transform;
        }
        @keyframes particle-float {
          0% { transform: translateY(0) translateX(0) scale(1); }
          50% { transform: translateY(-20px) translateX(10px) scale(1.2); }
          100% { transform: translateY(10px) translateX(-8px) scale(0.8); }
        }
      `}</style>
    </div>
  )
}
