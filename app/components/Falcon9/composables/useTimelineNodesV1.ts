import type { ToRefs } from 'vue'

// --- 类型定义 ---
interface NodeProps {
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  pastNodeDensityFactor?: number
  futureNodeDensityFactor?: number
}

interface Geometry {
  circleRadius: number
  circleCenterX: number
  circleCenterY: number
  effectiveSvgHeight: number
}

// 定义 V1 节点处理后的数据结构
export interface ProcessedNodeV1 {
  key: string
  isVisible: boolean
  isPast: boolean
  position: { cx: number, cy: number }
  line: { x1: number, y1: number, x2: number, y2: number } | null
  text: {
    content: string[]
    x: number
    y: number
    transform: string
    dominantBaseline: 'text-after-edge' | 'text-before-edge'
  }
}

// --- 辅助函数 ---
function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

// --- Composable 主函数 ---
export function useTimelineNodesV1(
  props: ToRefs<NodeProps>,
  geometry: ToRefs<Geometry>,
) {
  const processedNodes = computed((): ProcessedNodeV1[] => {
    const {
      circleRadius,
      circleCenterX,
      circleCenterY,
      effectiveSvgHeight,
    } = geometry

    const currentTimelineTime = props.currentTimeOffset?.value ?? 0
    const halfMissionDuration = props.missionDuration.value / 2
    if (halfMissionDuration <= 0)
      return []

    // --- V1 特有的密度因子计算逻辑 ---
    const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor?.value ?? 2.0)
    const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor?.value ?? 2.0)
    const animationStartTime = -20
    const animationDuration = 7
    const animationEndTime = animationStartTime + animationDuration

    let applicableDensityFactor: number
    if (currentTimelineTime < animationStartTime) {
      applicableDensityFactor = safePastDensityFactor
    }
    else if (currentTimelineTime >= animationStartTime && currentTimelineTime <= animationEndTime) {
      const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration
      const easedProgress = easeInOutSine(linearProgress)
      applicableDensityFactor = safePastDensityFactor * (1 - easedProgress) + safeFutureDensityFactor * easedProgress
    }
    else {
      applicableDensityFactor = safeFutureDensityFactor
    }

    // 节点和文本的固定参数
    const nodeDotRadius = 6.5
    const textOffsetFromNodeEdge = 18
    const lineToTextGap = 7

    return props.timestamps.value.map((timestamp, i) => {
      const eventName = props.nodeNames.value[i] || `事件 ${i + 1}`
      const timeRelativeToNow = timestamp - currentTimelineTime

      const angularOffsetBase = (timeRelativeToNow / halfMissionDuration) * Math.PI
      const angularOffset = angularOffsetBase / applicableDensityFactor
      const angleRad = angularOffset - (Math.PI / 2)

      const cx = circleCenterX.value + circleRadius.value * Math.cos(angleRad)
      const cy = circleCenterY.value + circleRadius.value * Math.sin(angleRad)

      const isVisible = cy >= -nodeDotRadius && cy <= effectiveSvgHeight.value + nodeDotRadius

      const isOutsideText = i % 2 === 1
      const textDirectionMultiplier = isOutsideText ? 1 : -1

      const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
      let line = null
      if (lineLength >= 1) {
        line = {
          x1: cx + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad),
          y1: cy + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad),
          x2: cx + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.cos(angleRad),
          y2: cy + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.sin(angleRad),
        }
      }

      const textCenterX = cx + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
      const textCenterY = cy + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)
      const textRotationDeg = angleRad * (180 / Math.PI) + 90

      return {
        key: `${timestamp}-${eventName}`,
        isVisible,
        isPast: timeRelativeToNow <= 0,
        position: { cx, cy },
        line,
        text: {
          content: eventName.split(' '),
          x: textCenterX,
          y: textCenterY,
          transform: `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`,
          dominantBaseline: isOutsideText ? 'text-after-edge' : 'text-before-edge',
        },
      }
    })
  })

  return { processedNodes }
}
