'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface GestureDetectorProps {
  onRotate?: (deltaX: number, deltaY: number) => void
  onZoom?: (delta: number) => void
  onSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
  enabled?: boolean
}

type GestureType = 'none' | 'open_palm' | 'fist' | 'pinch' | 'point' | 'swipe'

export default function GestureDetector({
  onRotate,
  onZoom,
  onSwipe,
  enabled = true,
}: GestureDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gesture, setGesture] = useState<GestureType>('none')
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevPositionRef = useRef<{ x: number; y: number } | null>(null)
  const handsRef = useRef<any>(null)

  // 初始化 MediaPipe Hands
  const initHands = useCallback(async () => {
    try {
      const { Hands } = await import('@mediapipe/hands')
      const { Camera } = await import('@mediapipe/camera_utils')

      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        },
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // 轻量模型
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      hands.onResults((results) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
          setGesture('none')
          prevPositionRef.current = null
          return
        }

        const landmarks = results.multiHandLandmarks[0]
        const detectedGesture = detectGesture(landmarks)
        setGesture(detectedGesture)

        // 根据手势触发回调
        handleGestureAction(detectedGesture, landmarks)
      })

      handsRef.current = hands

      // 启动摄像头
      if (videoRef.current) {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current })
            }
          },
          width: 320,
          height: 240,
        })
        await camera.start()
        setCameraActive(true)
      }
    } catch (err) {
      setError('无法启动摄像头，请检查权限设置')
      console.error('MediaPipe init error:', err)
    }
  }, [])

  // 手势识别
  const detectGesture = (landmarks: any[]): GestureType => {
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    const wrist = landmarks[0]

    const indexMcp = landmarks[5]
    const middleMcp = landmarks[9]
    const ringMcp = landmarks[13]
    const pinkyMcp = landmarks[17]

    // 计算手指是否伸直
    const isIndexExtended = indexTip.y < indexMcp.y
    const isMiddleExtended = middleTip.y < middleMcp.y
    const isRingExtended = ringTip.y < ringMcp.y
    const isPinkyExtended = pinkyTip.y < pinkyMcp.y

    // 捏合手势：拇指和食指靠近
    const pinchDistance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y
    )
    if (pinchDistance < 0.05) return 'pinch'

    // 张开手掌：所有手指伸直
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'open_palm'
    }

    // 握拳：所有手指弯曲
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'fist'
    }

    // 指向：只有食指伸直
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'point'
    }

    return 'none'
  }

  // 处理手势动作
  const handleGestureAction = (gesture: GestureType, landmarks: any[]) => {
    const indexTip = landmarks[8]

    if (gesture === 'open_palm') {
      // 张开手掌 → 旋转照片球
      if (prevPositionRef.current) {
        const deltaX = (indexTip.x - prevPositionRef.current.x) * 5
        const deltaY = (indexTip.y - prevPositionRef.current.y) * 5
        onRotate?.(deltaX, deltaY)
      }
      prevPositionRef.current = { x: indexTip.x, y: indexTip.y }
    } else if (gesture === 'pinch') {
      // 捏合 → 缩放
      const thumbTip = landmarks[4]
      const distance = Math.hypot(
        thumbTip.x - indexTip.x,
        thumbTip.y - indexTip.y
      )
      onZoom?.(distance > 0.03 ? 0.1 : -0.1)
      prevPositionRef.current = null
    } else if (gesture === 'fist') {
      // 握拳 → 停止
      prevPositionRef.current = null
    } else {
      prevPositionRef.current = null
    }
  }

  // 启动摄像头
  const startCamera = async () => {
    await initHands()
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
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
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
        }}>
          {gesture === 'open_palm' && '✋ 旋转中'}
          {gesture === 'pinch' && '🤏 缩放中'}
          {gesture === 'fist' && '✊ 已暂停'}
          {gesture === 'point' && '☝️ 指向'}
          {gesture === 'none' && '等待手势...'}
        </div>
      </div>

      {/* 启动按钮 */}
      {!cameraActive && (
        <button
          onClick={startCamera}
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
          📷 启动手势控制
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
          fontSize: '12px',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
