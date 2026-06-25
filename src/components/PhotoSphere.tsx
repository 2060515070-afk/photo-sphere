'use client'

import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface Photo {
  id: string
  url: string
  thumbnail: string
  tags: string[]
}

interface PhotoSphereProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
  gestureRotationRef?: React.MutableRefObject<{ x: number; y: number } | null>
  gestureZoomRef?: React.MutableRefObject<number | null>
}

const COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#ef4444', '#3b82f6', '#84cc16', '#f97316',
]

// 单张漂浮照片 — 始终朝向球心
function FloatingPhoto({
  photo,
  position,
  index,
  onClick,
}: {
  photo: Photo
  position: [number, number, number]
  index: number
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = COLORS[index % COLORS.length]
  const tag = photo.tags?.[0] || '📷'
  const emojis: Record<string, string> = {
    '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾',
    '建筑': '🏛️', '自然': '🌿', '夜景': '🌙', '海边': '🏖️',
    '截图': '📱', '文档': '📄', '自拍': '🤳', '合照': '👥',
    '宠物': '🐕', '花卉': '🌸',
  }
  const emoji = emojis[tag] || '📷'
  const imgUrl = photo.thumbnail || photo.url
  const hasImage = imgUrl
  const [imgError, setImgError] = useState(false)

  const lookAtQuat = useMemo(() => {
    const dir = new THREE.Vector3(...position).normalize()
    const m = new THREE.Matrix4()
    m.lookAt(new THREE.Vector3(0, 0, 0), dir, new THREE.Vector3(0, 1, 0))
    const q = new THREE.Quaternion()
    q.setFromRotationMatrix(m)
    return q
  }, [position])

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return
    const t = state.clock.elapsedTime
    const baseY = position[1] + Math.sin(t * 0.6 + position[0] * 1.5) * 0.08
    groupRef.current.position.set(position[0], baseY, position[2])
    groupRef.current.quaternion.copy(lookAtQuat)
    const s = hovered ? 1.3 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12)
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} />
        {hovered && (
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(0.94, 0.94)]} />
            <lineBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </lineSegments>
        )}
        <Html center style={{ pointerEvents: 'none', userSelect: 'none' }} distanceFactor={5}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '76px', height: '76px', color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}>
            {hasImage && !imgError ? (
              <img
                src={imgUrl}
                alt=""
                style={{
                  width: '70px', height: '70px', objectFit: 'cover',
                  borderRadius: '8px', border: '2px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
                }}
                onError={() => setImgError(true)}
              />
            ) : (
              <>
                <span style={{ fontSize: '28px' }}>{emoji}</span>
                <span style={{ fontSize: '10px', marginTop: '3px', opacity: 0.7 }}>{tag}</span>
              </>
            )}
          </div>
        </Html>
      </mesh>
    </group>
  )
}

// Fibonacci 球形分布
function fibonacciSphere(n: number, radius = 5): [number, number, number][] {
  const pos: [number, number, number][] = []
  const phi = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / phi
    const z = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - z * z)
    pos.push([radius * r * Math.cos(theta), radius * r * Math.sin(theta), radius * z])
  }
  return pos
}

// 背景粒子
function Particles() {
  const ref = useRef<THREE.Points>(null)
  const count = 400
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.006
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#5a5a8a" transparent opacity={0.35} sizeAttenuation />
    </points>
  )
}

// 球心光晕
function GlowSphere() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const s = 0.18 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04
    ref.current.scale.set(s, s, s)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#6366f1" transparent opacity={0.12} />
    </mesh>
  )
}

// 3D 场景 — 通过 ref 读取手势数据
function Scene({
  photos,
  onPhotoClick,
  gestureRotationRef,
  gestureZoomRef,
}: PhotoSphereProps) {
  const positions = useMemo(() => {
    const radius = Math.max(4, Math.min(8, photos.length * 0.15 + 3))
    return fibonacciSphere(photos.length, radius)
  }, [photos.length])

  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    // 缓慢自转
    groupRef.current.rotation.y += 0.002

    // 读取手势旋转（从 ref，每帧消费后清空）
    if (gestureRotationRef?.current) {
      const { x, y } = gestureRotationRef.current
      groupRef.current.rotation.y += x * 0.15
      groupRef.current.rotation.x += y * 0.15
      groupRef.current.rotation.x = Math.max(-1.2, Math.min(1.2, groupRef.current.rotation.x))
      gestureRotationRef.current = null // 消费完毕
    }

    // 读取手势缩放
    if (gestureZoomRef?.current) {
      const cam = state.camera
      const dir = new THREE.Vector3()
      cam.getWorldDirection(dir)
      cam.position.addScaledVector(dir, -gestureZoomRef.current * 1.5)
      const dist = cam.position.length()
      if (dist < 3) cam.position.setLength(3)
      if (dist > 18) cam.position.setLength(18)
      gestureZoomRef.current = null // 消费完毕
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.3} />
      <pointLight position={[-8, -6, -8]} intensity={0.2} color="#8b5cf6" />
      <OrbitControls
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={18}
        zoomSpeed={0.5}
        rotateSpeed={0.6}
      />
      <group ref={groupRef}>
        {photos.map((photo, i) => (
          <FloatingPhoto
            key={photo.id}
            photo={photo}
            position={positions[i] || [0, 0, 0]}
            index={i}
            onClick={() => onPhotoClick?.(photo)}
          />
        ))}
      </group>
      <GlowSphere />
      <Particles />
    </>
  )
}

// 主组件
export default function PhotoSphere({
  photos,
  onPhotoClick,
  gestureRotationRef,
  gestureZoomRef,
}: PhotoSphereProps) {
  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', color: '#8888a0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌐</div>
        <p>没有照片可以展示</p>
      </div>
    )
  }

  return (
    <div className="sphere-container">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 55 }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene
          photos={photos}
          onPhotoClick={onPhotoClick}
          gestureRotationRef={gestureRotationRef}
          gestureZoomRef={gestureZoomRef}
        />
      </Canvas>
      <div className="gesture-indicator">
        🖱️ 拖拽旋转 · 滚轮缩放 · 点击查看 · {photos.length} 张照片
      </div>
    </div>
  )
}
