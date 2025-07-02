// composables/useTimelineNodes.ts

import type { ToRefs } from 'vue'
import { computed } from 'vue'
import { interpolateColor, parseRgba } from '../utils/color'

// --- 类型定义 ---
interface NodeProps {
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  // [NEW] 新增平均疏密度
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

// --- 颜色和动画常量 ---
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

    // --- [MODIFIED] 动画参数更新 ---
    const animationStartTime = -9
    const animationDuration = 4
    const animationEndTime = animationStartTime + animationDuration // Will be -5s

    // Color transition config (unchanged)
    const colorTransitionDuration = 1.0
    const transitionStartOffset = colorTransitionDuration / 2
    const transitionEndOffset = -colorTransitionDuration / 2

    // --- [NEW LOGIC] 默认的疏密度常量 ---
    const avgDensity = props.averageDensityFactor?.value ?? 5 // 新的平均疏密度，默认值为 2.0
    const pastDensity = props.pastNodeDensityFactor?.value ?? 1
    const futureDensity = props.futureNodeDensityFactor?.value ?? 2.0

    // Map each timestamp to a processed node object
    return props.timestamps.value.map((timestamp, i) => {
      const eventName = props.nodeNames.value[i] || `Event ${i + 1}`
      const timeRelativeToNow = timestamp - currentTimelineTime

      // --- [NEW LOGIC] 节点疏密度计算 (移入循环内部) ---
      let applicableDensityFactor: number

      // Phase 1: Static/Average State (before transition starts)
      if (currentTimelineTime < animationStartTime) {
        applicableDensityFactor = avgDensity
      }
      // Phase 3: Dynamic State (after transition ends)
      else if (currentTimelineTime >= animationEndTime) {
        applicableDensityFactor = (timeRelativeToNow <= 0) ? pastDensity : futureDensity
      }
      // Phase 2: Transition State (during the animation)
      else {
        // Determine the target density for this specific node
        const targetDensity = (timeRelativeToNow <= 0) ? pastDensity : futureDensity

        // Calculate the animation's eased progress
        const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration
        const easedProgress = easeInOutSine(linearProgress)

        // Interpolate from the average density to the node's target density
        applicableDensityFactor = avgDensity * (1 - easedProgress) + targetDensity * easedProgress
      }

      // --- Color calculation logic remains the same ---
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

      // --- Position calculation now uses the new per-node density factor ---
      const angularOffset = (timeRelativeToNow / (props.missionDuration.value / 2)) * Math.PI / applicableDensityFactor
      const angleRad = angularOffset - (Math.PI / 2)
      const cx = circleCenterX.value + circleRadius.value * Math.cos(angleRad)
      const cy = circleCenterY.value + circleRadius.value * Math.sin(angleRad)

      // ... (Rest of the code for text calculation and returning the node object is unchanged) ...
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
