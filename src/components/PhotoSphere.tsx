'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
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

  // 加载纹理
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(photo.thumbnail, (tex) => {
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      setTexture(tex)
    })
  }, [photo.thumbnail])

  // 漂浮动画
  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    // 轻微浮动
    meshRef.current.position.y =
      position[1] + Math.sin(time * 0.5 + position[0]) * 0.15

    // 轻微旋转
    meshRef.current.rotation.y = Math.sin(time * 0.3 + position[2]) * 0.1
    meshRef.current.rotation.x = Math.sin(time * 0.2 + position[0]) * 0.05

    // 悬停效果
    if (hovered) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.1)
    } else {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
    }
  })

  if (!texture) return null

  // 根据图片比例调整大小
  const img = texture.image as HTMLImageElement | undefined
  const aspect = img ? img.width / img.height : 1
  const width = aspect >= 1 ? 1.2 : 0.8 * aspect
  const height = aspect >= 1 ? 1.2 / aspect : 0.8

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={() => {
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
      />

      {/* 照片边框光晕 */}
      {hovered && (
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(width + 0.05, height + 0.05)]} />
          <lineBasicMaterial color="#6366f1" transparent opacity={0.6} />
        </lineSegments>
      )}
    </mesh>
  )
}

// 球形分布计算
function fibonacciSphere(n: number, radius: number = 5): [number, number, number][] {
  const positions: [number, number, number][] = []
  const goldenRatio = (1 + Math.sqrt(5)) / 2

  for (let i = 0; i < n; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio
    const phi = Math.acos(1 - (2 * (i + 0.5)) / n)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    positions.push([x, y, z])
  }

  return positions
}

// 场景内容
function Scene({ photos, onPhotoClick }: PhotoSphereProps) {
  const positions = useMemo(
    () => fibonacciSphere(photos.length),
    [photos.length]
  )

  const groupRef = useRef<THREE.Group>(null)

  // 整体缓慢自旋
  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.02
  })

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.3} />

      {/* 轨道控制 */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={15}
        autoRotate={false}
        zoomSpeed={0.5}
        rotateSpeed={0.5}
      />

      {/* 照片组 */}
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

      {/* 中心装饰 */}
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial
          color="#6366f1"
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* 粒子背景 */}
      <Points />
    </>
  )
}

// 背景粒子
function Points() {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 500

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30
    }
    return pos
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.005
  })

  return (
    <points ref={pointsRef}>\n      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#4a4a6a"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

// 主组件
export default function PhotoSphere({ photos, onPhotoClick }: PhotoSphereProps) {
  return (
    <div className="sphere-container">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Scene photos={photos} onPhotoClick={onPhotoClick} />
      </Canvas>

      {/* 操作提示 */}
      <div className="gesture-indicator">
        🖱️ 拖拽旋转 · 滚轮缩放 · 点击查看
      </div>
    </div>
  )
}
