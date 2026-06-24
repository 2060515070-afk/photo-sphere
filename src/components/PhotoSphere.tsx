'use client'

import { useRef, useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
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

// 单张漂浮照片
function FloatingPhoto({
  photo,
  position,
  onClick,
}: {
  photo: Photo
  position: [number, number, number]
  onClick?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(photo.thumbnail, (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      setTexture(tex)
    }, undefined, () => {
      // 加载失败时用默认颜色
      setTexture(null)
    })
  }, [photo.thumbnail])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    // 漂浮
    meshRef.current.position.y = position[1] + Math.sin(time * 0.5 + position[0] * 2) * 0.12
    meshRef.current.rotation.y = Math.sin(time * 0.3 + position[2]) * 0.08
    // 悬停放大
    const targetScale = hovered ? 1.25 : 1
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    )
  })

  if (!texture) {
    // 没纹理时显示占位方块
    return (
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[0.8, 0.8, 0.05]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.6} />
      </mesh>
    )
  }

  const img = texture.image as HTMLImageElement | undefined
  const aspect = img ? img.width / img.height : 1
  const w = aspect >= 1 ? 1.1 : 0.75 * aspect
  const h = aspect >= 1 ? 1.1 / aspect : 0.75

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} toneMapped={false} />
      {hovered && (
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(w + 0.04, h + 0.04)]} />
          <lineBasicMaterial color="#6366f1" transparent opacity={0.7} />
        </lineSegments>
      )}
    </mesh>
  )
}

// Fibonacci 球形分布
function fibonacciSphere(n: number, radius = 5): [number, number, number][] {
  const positions: [number, number, number][] = []
  const phi = (1 + Math.sqrt(5)) / 2
  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / phi
    const z = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - z * z)
    positions.push([
      radius * r * Math.cos(theta),
      radius * r * Math.sin(theta),
      radius * z,
    ])
  }
  return positions
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
    ref.current.rotation.y = state.clock.elapsedTime * 0.008
    ref.current.rotation.x = state.clock.elapsedTime * 0.003
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#4a4a6a" transparent opacity={0.5} sizeAttenuation />
    </points>
  )
}

// 3D 场景
function Scene({ photos, onPhotoClick, rotationDelta, zoomDelta }: PhotoSphereProps) {
  const positions = useMemo(() => fibonacciSphere(photos.length), [photos.length])
  const groupRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<any>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    // 自旋
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.015

    // 手势旋转
    if (rotationDelta) {
      groupRef.current.rotation.y += rotationDelta.x * 0.05
      groupRef.current.rotation.x += rotationDelta.y * 0.05
      groupRef.current.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, groupRef.current.rotation.x))
    }

    // 手势缩放
    if (zoomDelta && controlsRef.current) {
      const camera = state.camera
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      camera.position.addScaledVector(dir, -zoomDelta * 0.3)
      // 限制距离
      const dist = camera.position.length()
      if (dist < 3) camera.position.setLength(3)
      if (dist > 15) camera.position.setLength(15)
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.3} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={15}
        zoomSpeed={0.5}
        rotateSpeed={0.5}
      />

      <group ref={groupRef}>
        {photos.map((photo, i) => (
          <FloatingPhoto
            key={photo.id}
            photo={photo}
            position={positions[i] || [0, 0, 0]}
            onClick={() => onPhotoClick?.(photo)}
          />
        ))}
      </group>

      {/* 中心光球 */}
      <mesh>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.12} />
      </mesh>

      <Particles />
    </>
  )
}

// 主组件
export default function PhotoSphere({ photos, onPhotoClick, rotationDelta, zoomDelta }: PhotoSphereProps) {
  return (
    <div className="sphere-container">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Scene
          photos={photos}
          onPhotoClick={onPhotoClick}
          rotationDelta={rotationDelta}
          zoomDelta={zoomDelta}
        />
      </Canvas>
      <div className="gesture-indicator">
        🖱️ 拖拽旋转 · 滚轮缩放 · 点击查看
      </div>
    </div>
  )
}
