'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
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
  rotationDelta?: { x: number; y: number } | null
  zoomDelta?: number | null
}

// 颜色列表
const COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
  '#ef4444', '#3b82f6', '#84cc16', '#f97316',
]

// 单张漂浮照片（用彩色方块 + HTML 标签）
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
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = COLORS[index % COLORS.length]
  const tag = photo.tags[0] || '📷'
  const emojis: Record<string, string> = {
    '风景': '🏔️', '人物': '👤', '美食': '🍜', '动物': '🐾',
    '建筑': '🏛️', '自然': '🌿', '夜景': '🌙', '海边': '🏖️',
  }
  const emoji = emojis[tag] || '📷'

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    meshRef.current.position.y = position[1] + Math.sin(t * 0.5 + position[0] * 2) * 0.12
    meshRef.current.rotation.y = Math.sin(t * 0.3 + position[2]) * 0.08
    const s = hovered ? 1.25 : 1
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1)
  })

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
        {hovered && (
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(1.04, 1.04)]} />
            <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </lineSegments>
        )}
        {/* HTML 标签覆盖 */}
        <Html center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            width: '80px', height: '80px', color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
            <span style={{ fontSize: '32px' }}>{emoji}</span>
            <span style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>{tag}</span>
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
  const count = 300
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 25
      arr[i * 3 + 1] = (Math.random() - 0.5) * 25
      arr[i * 3 + 2] = (Math.random() - 0.5) * 25
    }
    return arr
  }, [])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.008
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#4a4a6a" transparent opacity={0.4} sizeAttenuation />
    </points>
  )
}

// 3D 场景
function Scene({ photos, onPhotoClick, rotationDelta, zoomDelta }: PhotoSphereProps) {
  const positions = useMemo(() => fibonacciSphere(photos.length), [photos.length])
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.015
    if (rotationDelta) {
      groupRef.current.rotation.y += rotationDelta.x * 0.05
      groupRef.current.rotation.x += rotationDelta.y * 0.05
      groupRef.current.rotation.x = Math.max(-1, Math.min(1, groupRef.current.rotation.x))
    }
    if (zoomDelta) {
      const cam = state.camera
      const dir = new THREE.Vector3()
      cam.getWorldDirection(dir)
      cam.position.addScaledVector(dir, -zoomDelta * 0.3)
      const dist = cam.position.length()
      if (dist < 3) cam.position.setLength(3)
      if (dist > 15) cam.position.setLength(15)
    }
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.4} />
      <OrbitControls enablePan={false} enableZoom minDistance={3} maxDistance={15} zoomSpeed={0.5} rotateSpeed={0.5} />
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
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.1} />
      </mesh>
      <Particles />
    </>
  )
}

// 主组件
export default function PhotoSphere({ photos, onPhotoClick, rotationDelta, zoomDelta }: PhotoSphereProps) {
  return (
    <div className="sphere-container">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }} style={{ background: 'transparent' }}>
        <Scene photos={photos} onPhotoClick={onPhotoClick} rotationDelta={rotationDelta} zoomDelta={zoomDelta} />
      </Canvas>
      <div className="gesture-indicator">
        🖱️ 拖拽旋转 · 滚轮缩放 · 点击查看
      </div>
    </div>
  )
}
