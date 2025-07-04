import type { ToRefs } from 'vue'

// --- 类型定义 (保持不变) ---
interface NodeProps {
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  averageDensityFactor?: number
  pastNodeDensityFactor?: number
  futureNodeDensityFactor?: number
}

interface Geometry {
  circleRadius: number
  circleCenterX: number
  circleCenterY: number
  effectiveSvgHeight: number
}

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

// --- 辅助函数 (保持不变) ---
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
    const viewWindowStart = currentTimelineTime - halfMissionDuration
    const viewWindowEnd = currentTimelineTime + halfMissionDuration
    if (halfMissionDuration <= 0)
      return []

    // 动画参数
    const animationStartTime = -9
    const animationDuration = 4
    const animationEndTime = animationStartTime + animationDuration // -5s

    // 时间缩放因子
    const avgScale = props.averageDensityFactor?.value ?? 1
    const pastScale = props.pastNodeDensityFactor?.value ?? 2
    const futureScale = props.futureNodeDensityFactor?.value ?? 2

    // 根据当前时间，计算出用于动画的实时缩放因子
    let animatedPastScale: number
    let animatedFutureScale: number

    if (currentTimelineTime < animationStartTime) {
      animatedPastScale = avgScale
      animatedFutureScale = avgScale
    }
    else if (currentTimelineTime >= animationEndTime) {
      animatedPastScale = pastScale
      animatedFutureScale = futureScale
    }
    else {
      const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration
      const easedProgress = easeInOutSine(linearProgress)
      animatedPastScale = avgScale * (1 - easedProgress) + pastScale * easedProgress
      animatedFutureScale = avgScale * (1 - easedProgress) + futureScale * easedProgress
    }

    // V2 的核心函数：将真实时间点映射到被拉伸/压缩后的虚拟时间点
    function mapTime(time: number): number {
      if (time <= 0)
        return time * animatedPastScale
      else
        return time * animatedFutureScale
    }

    // 节点和文本的固定参数
    const nodeDotRadius = 6.5
    const textOffsetFromNodeEdge = 18
    const lineToTextGap = 7

    return props.timestamps.value
      .map((timestamp, i) => ({
        timestamp,
        name: props.nodeNames.value[i] || `Event ${i + 1}`,
        originalIndex: i,
      }))
      .filter(event => event.timestamp >= viewWindowStart && event.timestamp <= viewWindowEnd)
      .map((event) => {
        const { timestamp, name, originalIndex } = event

        // --- [采用V2的位置计算逻辑] ---
        const mappedTimestamp = mapTime(timestamp)
        const mappedCurrentTime = mapTime(currentTimelineTime)
        const virtualTimeRelativeToNow = mappedTimestamp - mappedCurrentTime

        // 使用“虚拟时间差”来计算角度
        const angularOffset = (virtualTimeRelativeToNow / (props.missionDuration.value / 2)) * Math.PI
        const angleRad = angularOffset - (Math.PI / 2)

        const cx = circleCenterX.value + circleRadius.value * Math.cos(angleRad)
        const cy = circleCenterY.value + circleRadius.value * Math.sin(angleRad)

        // 物理可见性判断
        const isVisible = cy >= -nodeDotRadius && cy <= effectiveSvgHeight.value + nodeDotRadius
        const timeRelativeToNow = timestamp - currentTimelineTime

        // --- 文本和线条计算 (逻辑不变) ---
        const eventName = name
        const isOutsideText = originalIndex % 2 === 1
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
