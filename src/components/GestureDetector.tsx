'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface GestureDetectorProps {
  onRotate?: (deltaX: number, deltaY: number) => void
  onZoom?: (delta: number) => void
  enabled?: boolean
}

type GestureType = 'none' | 'open_palm' | 'fist' | 'pinch' | 'point'

export default function GestureDetector({
  onRotate,
  onZoom,
  enabled = false,
}: GestureDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [gesture, setGesture] = useState<GestureType>('none')
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevPosRef = useRef<{ x: number; y: number } | null>(null)
  const prevPinchRef = useRef<number | null>(null)
  const handsRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)

  // 初始化手势识别
  const initHands = useCallback(async () => {
    try {
      // 动态加载 MediaPipe
      const { Hands } = await import('@mediapipe/hands')

      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
        },
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      })

      hands.onResults((results: any) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          setGesture('none')
          prevPosRef.current = null
          prevPinchRef.current = null
          return
        }

        const landmarks = results.multiHandLandmarks[0]
        const detected = detectGesture(landmarks)
        setGesture(detected)
        handleGesture(detected, landmarks)
      })

      handsRef.current = hands

      // 获取摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraActive(true)

        // 逐帧检测
        const detect = async () => {
          if (!videoRef.current || !handsRef.current) return
          if (videoRef.current.readyState >= 2) {
            await handsRef.current.send({ image: videoRef.current })
          }
          animFrameRef.current = requestAnimationFrame(detect)
        }
        detect()
      }
    } catch (err: any) {
      console.error('Gesture init error:', err)
      if (err.name === 'NotAllowedError') {
        setError('摄像头权限被拒绝，请在浏览器设置中允许')
      } else {
        setError('手势识别初始化失败: ' + err.message)
      }
    }
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(t => t.stop())
      }
    }
  }, [])

  // 手势识别逻辑
  const detectGesture = (landmarks: any[]): GestureType => {
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]

    const indexMcp = landmarks[5]
    const middleMcp = landmarks[9]
    const ringMcp = landmarks[13]
    const pinkyMcp = landmarks[17]

    // 捏合：拇指和食指靠近
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
    if (pinchDist < 0.06) return 'pinch'

    // 判断手指是否伸直（指尖 y < 指根 y，因为 y 轴向下）
    const indexUp = indexTip.y < indexMcp.y
    const middleUp = middleTip.y < middleMcp.y
    const ringUp = ringTip.y < ringMcp.y
    const pinkyUp = pinkyTip.y < pinkyMcp.y

    // 张开手掌：全部伸直
    if (indexUp && middleUp && ringUp && pinkyUp) return 'open_palm'

    // 握拳：全部弯曲
    if (!indexUp && !middleUp && !ringUp && !pinkyUp) return 'fist'

    // 指向：只有食指
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'point'

    return 'none'
  }

  // 处理手势动作
  const handleGesture = (gesture: GestureType, landmarks: any[]) => {
    const indexTip = landmarks[8]
    const thumbTip = landmarks[4]

    if (gesture === 'open_palm') {
      // 手掌移动 → 旋转（带平滑）
      if (prevPosRef.current) {
        const rawDx = (indexTip.x - prevPosRef.current.x) * 20
        const rawDy = (indexTip.y - prevPosRef.current.y) * 20
        // 死区过滤 + 平滑
        if (Math.abs(rawDx) > 0.005 || Math.abs(rawDy) > 0.005) {
          const smooth = 0.4 // 平滑系数，越小越平滑
          const dx = rawDx * smooth
          const dy = rawDy * smooth
          onRotate?.(dx, dy)
        }
      }
      prevPosRef.current = { x: indexTip.x, y: indexTip.y }
      prevPinchRef.current = null
    } else if (gesture === 'pinch') {
      // 捏合缩放
      const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
      if (prevPinchRef.current !== null) {
        const delta = (dist - prevPinchRef.current) * 200
        if (Math.abs(delta) > 0.01) {
          onZoom?.(delta)
        }
      }
      prevPinchRef.current = dist
      prevPosRef.current = null
    } else {
      prevPosRef.current = null
      prevPinchRef.current = null
    }
  }

  // 手势图标
  const gestureIcon: Record<GestureType, string> = {
    none: '等待手势...',
    open_palm: '✋ 旋转中',
    fist: '✊ 暂停',
    pinch: '🤏 缩放中',
    point: '☝️ 指向',
  }

  if (!enabled) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: 100,
    }}>
      {/* 摄像头预览 */}
      <div style={{
        width: '160px',
        height: '120px',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#000',
        position: 'relative',
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
          playsInline
          muted
        />

        {/* 手势状态 */}
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          right: '4px',
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '6px',
          fontSize: '11px',
          textAlign: 'center',
          backdropFilter: 'blur(4px)',
          color: gesture === 'none' ? '#888' : '#a5b4fc',
        }}>
          {gestureIcon[gesture]}
        </div>
      </div>

      {/* 启动按钮 */}
      {!cameraActive && (
        <button
          onClick={initHands}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '8px',
            color: '#a5b4fc',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          📷 启动手势
        </button>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '8px',
          color: '#fca5a5',
          fontSize: '11px',
          maxWidth: '160px',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
