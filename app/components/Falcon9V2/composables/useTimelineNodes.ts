// composables/useTimelineNodes.ts

import type { ToRefs } from 'vue'
import { computed } from 'vue'
import { interpolateColor, parseRgba } from '../utils/color'

// --- 类型定义 (与之前相同) ---
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

export interface ProcessedNode {
  key: string
  name: string
  isVisible: boolean
  position: { cx: number, cy: number }
  outerCircle: { color: string, radius: number }
  innerDot: { color: string, radius: number, shouldDraw: boolean }
  text: {
    content: string
    x: number
    y: number
    transform: string
    anchor: 'middle'
    baseline: 'text-after-edge' | 'text-before-edge'
  }
}

// --- 颜色和动画常量 (与之前相同) ---
const COLOR_PAST_PRESENT_STR = 'rgba(255, 255, 255, 1)'
const COLOR_FUTURE_STR = 'rgba(255, 255, 255, 0.3)'
const COLOR_INNER_DOT_START_STR = 'rgba(255, 255, 255, 0)'

const COLOR_PAST_PRESENT = parseRgba(COLOR_PAST_PRESENT_STR)!
const COLOR_FUTURE = parseRgba(COLOR_FUTURE_STR)!
const COLOR_INNER_DOT_START = parseRgba(COLOR_INNER_DOT_START_STR)!

const NODE_RADIUS = 6
const INNER_DOT_RADIUS = 2
const TEXT_OFFSET_FROM_NODE_EDGE = 0

// --- 辅助函数 ---
function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

// --- Composable 主函数 ---
export function useTimelineNodes(
  props: ToRefs<NodeProps>,
  geometry: ToRefs<Geometry>,
) {
  const processedNodes = computed((): ProcessedNode[] => {
    const currentTimelineTime = props.currentTimeOffset?.value ?? 0
    const { circleRadius, circleCenterX, circleCenterY, effectiveSvgHeight } = geometry

    // --- 动画参数 ---
    const animationStartTime = -9
    const animationDuration = 4
    const animationEndTime = animationStartTime + animationDuration // -5s

    // --- 颜色过渡参数 ---
    const colorTransitionDuration = 1.0
    const transitionStartOffset = colorTransitionDuration / 2
    const transitionEndOffset = -colorTransitionDuration / 2

    // --- 时间缩放因子 ---
    const avgScale = props.averageDensityFactor?.value ?? 0.5
    const pastScale = props.pastNodeDensityFactor?.value ?? 2.0
    const futureScale = props.futureNodeDensityFactor?.value ?? 1.0

    // --- 根据当前时间，计算出用于动画的实时缩放因子 ---
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

    /**
     * 核心函数：将真实时间点映射到被拉伸/压缩后的虚拟时间点
     */
    function mapTime(time: number): number {
      if (time <= 0)
        return time * animatedPastScale
      else
        return time * animatedFutureScale
    }

    // 将每个时间戳映射为处理后的节点对象
    return props.timestamps.value.map((timestamp, i) => {
      // --- 位置计算 ---
      const mappedTimestamp = mapTime(timestamp)
      const mappedCurrentTime = mapTime(currentTimelineTime)
      const virtualTimeRelativeToNow = mappedTimestamp - mappedCurrentTime

      // [FIXED] 核心改动：
      // 用“虚拟时间差”除以“固定的真实任务时长的一半”，
      // 这样缩放因子 avgScale 就不会被抵消了。
      const angularOffset = (virtualTimeRelativeToNow / (props.missionDuration.value / 2)) * (Math.PI / 2)
      const angleRad = angularOffset - (Math.PI / 2)

      const cx = circleCenterX.value + circleRadius.value * Math.cos(angleRad)
      const cy = circleCenterY.value + circleRadius.value * Math.sin(angleRad)

      // --- 颜色计算 (逻辑不变，仍然使用真实时间) ---
      const timeRelativeToNow = timestamp - currentTimelineTime
      let nodeColor: string
      let innerDotColor: string
      const shouldDrawInnerDot = timeRelativeToNow <= transitionStartOffset

      if (timeRelativeToNow <= transitionStartOffset && timeRelativeToNow >= transitionEndOffset) {
        const linearProgress = (transitionStartOffset - timeRelativeToNow) / colorTransitionDuration
        const easedProgress = easeInOutSine(linearProgress)
        nodeColor = interpolateColor(COLOR_FUTURE, COLOR_PAST_PRESENT, easedProgress)
        innerDotColor = interpolateColor(COLOR_INNER_DOT_START, COLOR_PAST_PRESENT, easedProgress)
      }
      else {
        nodeColor = (timeRelativeToNow > 0) ? COLOR_FUTURE_STR : COLOR_PAST_PRESENT_STR
        innerDotColor = (timeRelativeToNow > 0) ? COLOR_INNER_DOT_START_STR : COLOR_PAST_PRESENT_STR
      }

      // --- 文本计算和返回对象结构 (与之前相同) ---
      const eventName = props.nodeNames.value[i] || `Event ${i + 1}`
      const isOutsideText = i % 2 === 1
      const textDirection = isOutsideText ? 1 : -1
      const totalTextOffset = NODE_RADIUS + TEXT_OFFSET_FROM_NODE_EDGE
      const textX = cx + textDirection * totalTextOffset * Math.cos(angleRad)
      const textY = cy + textDirection * totalTextOffset * Math.sin(angleRad)
      const textRotationDeg = angleRad * (180 / Math.PI) + 90

      return {
        key: `${timestamp}-${eventName}`,
        name: eventName,
        isVisible: cy >= -NODE_RADIUS && cy <= effectiveSvgHeight.value + NODE_RADIUS,
        position: { cx, cy },
        outerCircle: { color: nodeColor, radius: NODE_RADIUS },
        innerDot: { color: innerDotColor, radius: INNER_DOT_RADIUS, shouldDraw: shouldDrawInnerDot },
        text: {
          content: eventName,
          x: textX,
          y: textY,
          transform: `rotate(${textRotationDeg}, ${textX}, ${textY})`,
          anchor: 'middle',
          baseline: isOutsideText ? 'text-after-edge' : 'text-before-edge',
        },
      }
    })
  })

  return { processedNodes }
}
