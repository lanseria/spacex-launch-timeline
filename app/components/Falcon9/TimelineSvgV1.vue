<script setup lang="ts">
import { toRefs } from 'vue'
import { useTimelineGeometryV1 } from './composables/useTimelineGeometryV1'
import { useTimelineNodesV1 } from './composables/useTimelineNodesV1'

// --- 组件 Props 定义 (保持不变) ---
const props = defineProps<{
  timestamps: number[]
  nodeNames: string[]
  missionDuration: number
  currentTimeOffset?: number
  svgWidth?: number
  svgHeight?: number
  pastNodeDensityFactor?: number
  futureNodeDensityFactor?: number
}>()

// --- 模板引用 ---
const contentGroupEl = useTemplateRef<SVGGElement>('contentGroupEl')

// --- 使用 Composables 获取响应式数据 ---
const propsRefs = toRefs(props)
const geometry = useTimelineGeometryV1(propsRefs)
const { processedNodes } = useTimelineNodesV1(propsRefs, geometry)

// --- 核心绘图函数 (现在变得非常简洁) ---
function plotNodesOnCircle() {
  const group = contentGroupEl.value
  if (!group) return

  // 获取当前计算出的几何属性值
  const { circleRadius, circleCenterX, circleCenterY } = geometry

  // 1. 清空 SVG
  group.innerHTML = ''

  // 2. 绘制静态装饰元素 (逻辑不变，直接使用 geometry 的值)
  const angleSpan = Math.PI / 2
  const startAngle = -Math.PI / 2 - angleSpan / 2
  const endAngle = -Math.PI / 2 + angleSpan / 2
  const arcDrawingFlags = '0 0 1'

  // 外层装饰弧
  const outerDecoArcRadius = circleRadius.value + 45
  if (outerDecoArcRadius > 0) {
    const x1_outer = circleCenterX.value + outerDecoArcRadius * Math.cos(startAngle)
    const y1_outer = circleCenterY.value + outerDecoArcRadius * Math.sin(startAngle)
    const x2_outer = circleCenterX.value + outerDecoArcRadius * Math.cos(endAngle)
    const y2_outer = circleCenterY.value + outerDecoArcRadius * Math.sin(endAngle)
    const outerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    outerArcPath.setAttribute('d', `M ${x1_outer} ${y1_outer} A ${outerDecoArcRadius} ${outerDecoArcRadius} ${arcDrawingFlags} ${x2_outer} ${y2_outer} Z`)
    outerArcPath.setAttribute('fill', 'rgba(0, 0, 0, 0.3)')
    group.appendChild(outerArcPath)
  }
  // 内层装饰弧
  const innerDecoArcRadius = circleRadius.value - 45
  if (innerDecoArcRadius > 0) {
    const x1_inner = circleCenterX.value + innerDecoArcRadius * Math.cos(startAngle)
    const y1_inner = circleCenterY.value + innerDecoArcRadius * Math.sin(startAngle)
    const x2_inner = circleCenterX.value + innerDecoArcRadius * Math.cos(endAngle)
    const y2_inner = circleCenterY.value + innerDecoArcRadius * Math.sin(endAngle)
    const innerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcPath.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner} Z`)
    innerArcPath.setAttribute('fill', 'rgba(0, 0, 0, 0.7)')
    const innerArcBorder = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcBorder.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner}`)
    innerArcBorder.setAttribute('stroke', '#808080')
    innerArcBorder.setAttribute('stroke-width', '2')
    innerArcBorder.setAttribute('fill', 'none')
    group.appendChild(innerArcPath)
    group.appendChild(innerArcBorder)
  }
  // 主时间轴背景弧
  const mainArcRadius = circleRadius.value
  const bg_x1 = circleCenterX.value + mainArcRadius * Math.cos(startAngle)
  const bg_y1 = circleCenterY.value + mainArcRadius * Math.sin(startAngle)
  const bg_x2 = circleCenterX.value + mainArcRadius * Math.cos(endAngle)
  const bg_y2 = circleCenterY.value + mainArcRadius * Math.sin(endAngle)
  const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  bgArc.setAttribute('d', `M ${bg_x1} ${bg_y1} A ${mainArcRadius} ${mainArcRadius} ${arcDrawingFlags} ${bg_x2} ${bg_y2}`)
  bgArc.setAttribute('stroke', '#aaaaaa')
  bgArc.setAttribute('stroke-width', '2')
  bgArc.setAttribute('fill', 'none')
  group.appendChild(bgArc)
  // 当前时间标记线
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = circleCenterY.value - circleRadius.value
  markerLine.setAttribute('x1', String(circleCenterX.value))
  markerLine.setAttribute('y1', String(markLineY - 3))
  markerLine.setAttribute('x2', String(circleCenterX.value))
  markerLine.setAttribute('y2', String(markLineY + 3))
  markerLine.setAttribute('stroke', '#FFF')
  markerLine.setAttribute('stroke-width', '2')
  group.appendChild(markerLine)

  // 3. 遍历处理好的节点数据并渲染
  for (const node of processedNodes.value) {
    if (!node.isVisible) continue

    // 绘制节点外圆
    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(node.position.cx))
    nodeOuterCircle.setAttribute('cy', String(node.position.cy))
    nodeOuterCircle.setAttribute('r', '6.5')
    nodeOuterCircle.setAttribute('fill', '#000')
    nodeOuterCircle.setAttribute('stroke', '#FFF')
    nodeOuterCircle.setAttribute('stroke-width', '1.8')
    group.appendChild(nodeOuterCircle)

    // 绘制内部实心点
    if (node.isPast) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(node.position.cx))
      innerDotPast.setAttribute('cy', String(node.position.cy))
      innerDotPast.setAttribute('r', '3')
      innerDotPast.setAttribute('fill', '#FFF')
      group.appendChild(innerDotPast)
    }

    // 绘制指引线
    if (node.line) {
      const lineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      lineEl.setAttribute('x1', String(node.line.x1))
      lineEl.setAttribute('y1', String(node.line.y1))
      lineEl.setAttribute('x2', String(node.line.x2))
      lineEl.setAttribute('y2', String(node.line.y2))
      lineEl.setAttribute('stroke', '#ccc')
      lineEl.setAttribute('stroke-width', '2')
      group.appendChild(lineEl)
    }

    // 绘制文本
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.setAttribute('x', String(node.text.x))
    textElement.setAttribute('y', String(node.text.y))
    textElement.setAttribute('transform', node.text.transform)
    textElement.setAttribute('text-anchor', 'middle')
    textElement.setAttribute('dominant-baseline', node.text.dominantBaseline)
    textElement.setAttribute('fill', '#fff')
    textElement.setAttribute('font-size', '10px')
    textElement.setAttribute('font-family', 'Saira')
    textElement.setAttribute('font-weight', '500')

    // 处理多行文本
    const lineHeightEm = 1.2
    node.text.content.forEach((word, index) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
      tspan.setAttribute('x', String(node.text.x))
      tspan.textContent = word
      if (index === 0)
        tspan.setAttribute('dy', `${-((node.text.content.length - 1) / 2) * lineHeightEm}em`)
      else
        tspan.setAttribute('dy', `${lineHeightEm}em`)
      textElement.appendChild(tspan)
    })
    group.appendChild(textElement)
  }
}

// --- Vue 生命周期钩子和侦听器 ---
onMounted(plotNodesOnCircle)

// 当任何计算出的节点属性变化时，重新渲染整个时间轴
watch(processedNodes, plotNodesOnCircle, { deep: true })
</script>

<template>
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <!-- [修改] 直接使用 geometry 的计算属性 -->
    <svg class="w-full" :width="geometry.effectiveSvgWidth.value" :height="geometry.effectiveSvgHeight.value">
      <g ref="contentGroupEl" class="fade-opacity" />
    </svg>
  </div>
</template>

<style lang="css" scoped>
/* 样式保持不变 */
.fade-opacity {
  width: 1920px;
  height: 200px;
  mask: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.1) 10%,
    rgba(0, 0, 0, 0.55) 30%,
    rgba(0, 0, 0, 1) 35%,
    rgba(0, 0, 0, 1) 65%,
    rgba(0, 0, 0, 0.55) 70%,
    rgba(0, 0, 0, 0.1) 90%,
    transparent 100%
  );
}
</style>