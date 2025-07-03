<script setup lang="ts">
import type { ProcessedNode } from './composables/useTimelineNodes'
import { toRefs } from 'vue'
import { useTimelineGeometry } from './composables/useTimelineGeometry'
import { useTimelineNodes } from './composables/useTimelineNodes'
import { drawCircle, drawLine, drawPath, drawText } from './utils/svgDrawing'

// --- 组件 Props 定义 ---
const props = defineProps<{
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  svgWidth?: number
  svgHeight?: number
  averageDensityFactor?: number
  pastNodeDensityFactor?: number
  futureNodeDensityFactor?: number
}>()

// --- 模板引用 ---
const maskContentGroupEl = useTemplateRef<SVGGElement>('maskContentGroupEl')
const sharpContentGroupEl = useTemplateRef<SVGGElement>('sharpContentGroupEl')
const blurredContentGroupEl = useTemplateRef<SVGGElement>('blurredContentGroupEl')

// --- 使用 Composables 获取响应式数据 ---
const propsRefs = toRefs(props)
const geometry = useTimelineGeometry(propsRefs)

// [修改] 直接传递 geometry 对象，不再使用 toRefs()
const { processedNodes } = useTimelineNodes(propsRefs, geometry)

// --- 颜色常量 (仅用于静态元素) ---
const COLOR_PAST_PRESENT_STR = 'rgba(255, 255, 255, 1)'
const COLOR_FUTURE_STR = 'rgba(255, 255, 255, 0.3)'

// --- 绘图函数 ---

/** 清空所有绘图组 */
function clearCanvas() {
  const groups = [maskContentGroupEl.value, sharpContentGroupEl.value, blurredContentGroupEl.value]
  for (const group of groups) {
    if (group)
      group.innerHTML = ''
  }
}

/** 绘制不随时间变化的静态背景和装饰元素 */
function drawStaticElements() {
  const sharpGroup = sharpContentGroupEl.value!
  const blurredGroup = blurredContentGroupEl.value!
  const maskGroup = maskContentGroupEl.value!
  const { circleRadius, circleCenterX, circleCenterY } = geometry

  // 1. 装饰性模糊内弧
  const innerArcOffset = 32
  const borderArcRadius = circleRadius.value - innerArcOffset
  if (borderArcRadius > 0) {
    const angleSpan = Math.PI / 2
    const startAngle = -Math.PI / 2 - angleSpan / 2
    const endAngle = -Math.PI / 2 + angleSpan / 2

    const x1_blur = circleCenterX.value + (borderArcRadius + 10) * Math.cos(startAngle)
    const y1_blur = circleCenterY.value + (borderArcRadius + 10) * Math.sin(startAngle)
    const x2_blur = circleCenterX.value + (borderArcRadius + 10) * Math.cos(endAngle)
    const y2_blur = circleCenterY.value + (borderArcRadius + 10) * Math.sin(endAngle)
    drawPath(blurredGroup, {
      d: `M ${x1_blur} ${y1_blur} A ${borderArcRadius + 10} ${borderArcRadius + 10} 0 0 1 ${x2_blur} ${y2_blur} Z`,
      fill: 'rgba(0, 0, 0, 0.6)',
    })

    const x1_border = circleCenterX.value + borderArcRadius * Math.cos(startAngle)
    const y1_border = circleCenterY.value + borderArcRadius * Math.sin(startAngle)
    const x2_border = circleCenterX.value + borderArcRadius * Math.cos(endAngle)
    const y2_border = circleCenterY.value + borderArcRadius * Math.sin(endAngle)
    drawPath(sharpGroup, {
      'd': `M ${x1_border} ${y1_border} A ${borderArcRadius} ${borderArcRadius} 0 0 1 ${x2_border} ${y2_border}`,
      'stroke': 'rgba(153, 153, 153, 1)',
      'stroke-width': 1,
      'fill': 'none',
    })
  }

  // 2. 主时间轴弧线 (用于蒙版)
  const mainArcY = circleCenterY.value - circleRadius.value
  drawPath(maskGroup, {
    'd': `M ${circleCenterX.value - circleRadius.value} ${circleCenterY.value} A ${circleRadius.value} ${circleRadius.value} 0 0 1 ${circleCenterX.value} ${mainArcY}`,
    'stroke': COLOR_PAST_PRESENT_STR,
    'stroke-width': 2,
    'fill': 'none',
  })
  drawPath(maskGroup, {
    'd': `M ${circleCenterX.value} ${mainArcY} A ${circleRadius.value} ${circleRadius.value} 0 0 1 ${circleCenterX.value + circleRadius.value} ${circleCenterY.value}`,
    'stroke': COLOR_FUTURE_STR,
    'stroke-width': 2,
    'fill': 'none',
  })

  // 3. 顶部中心标记线
  drawLine(maskGroup, {
    'x1': circleCenterX.value,
    'y1': mainArcY - 5,
    'x2': circleCenterX.value,
    'y2': mainArcY + 5,
    'stroke': COLOR_PAST_PRESENT_STR,
    'stroke-width': 2,
  })
}

/** 根据处理后的节点数据绘制单个节点及其文本 */
function drawNode(node: ProcessedNode) {
  const sharpGroup = sharpContentGroupEl.value!
  const maskGroup = maskContentGroupEl.value!

  // 为节点在蒙版上 "打孔"
  drawCircle(maskGroup, {
    cx: node.position.cx,
    cy: node.position.cy,
    r: node.outerCircle.radius,
    fill: 'rgba(0, 0, 0, 1)',
  })

  // 绘制节点外圈
  drawCircle(sharpGroup, {
    'cx': node.position.cx,
    'cy': node.position.cy,
    'r': node.outerCircle.radius,
    'fill': 'none',
    'stroke': node.outerCircle.color,
    'stroke-width': 1,
  })

  // 绘制内部实心点 (如果需要)
  if (node.innerDot.shouldDraw) {
    drawCircle(sharpGroup, {
      cx: node.position.cx,
      cy: node.position.cy,
      r: node.innerDot.radius,
      fill: node.innerDot.color,
    })
  }

  // 绘制文本
  drawText(sharpGroup, node.text.content, {
    'x': node.text.x,
    'y': node.text.y,
    'fill': 'rgba(255, 255, 255, 1)',
    'font-size': '14px',
    'font-family': 'Saira, sans-serif',
    'font-weight': '600',
    'transform': node.text.transform,
    'text-anchor': node.text.anchor,
    'dominant-baseline': node.text.baseline,
  })
}

/** 主绘图函数，协调所有绘图操作 */
function renderTimeline() {
  if (!maskContentGroupEl.value || !sharpContentGroupEl.value || !blurredContentGroupEl.value)
    return

  clearCanvas()
  drawStaticElements()

  for (const node of processedNodes.value) {
    if (node.isVisible) {
      drawNode(node)
    }
  }
}

// --- Vue 生命周期钩子和侦听器 ---
onMounted(renderTimeline)

// 当任何计算出的节点属性变化时，重新渲染整个时间轴
watch(processedNodes, renderTimeline, { deep: true })
</script>

<template>
  <!-- Template (HTML部分) 和 Style (CSS部分) 保持不变 -->
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <svg class="w-full" :width="geometry.effectiveSvgWidth.value" :height="geometry.effectiveSvgHeight.value">
      <defs>
        <filter id="blurMe" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation="50" />
        </filter>
        <mask id="timeline-mask">
          <g ref="maskContentGroupEl" />
        </mask>
      </defs>
      <g class="fade-opacity">
        <g ref="blurredContentGroupEl" filter="url(#blurMe)" />
        <rect x="0" y="0" :width="geometry.effectiveSvgWidth.value" :height="geometry.effectiveSvgHeight.value" fill="rgba(255, 255, 255, 1)" mask="url(#timeline-mask)" />
        <g ref="sharpContentGroupEl" />
      </g>
    </svg>
  </div>
</template>

<style lang="css" scoped>
/* Style is unchanged */
.fade-opacity {
  mask: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0) 10%,
    rgba(0, 0, 0, 0.1) 25%,
    rgba(0, 0, 0, 1) 35%,
    rgba(0, 0, 0, 1) 65%,
    rgba(0, 0, 0, 0.1) 75%,
    rgba(0, 0, 0, 0) 90%,
    transparent 100%
  );
}
</style>
