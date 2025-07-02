<script setup lang="ts">
// components/TimelineSvg.vue

// --- 组件 Props 定义 ---
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
// [新增] 引用蒙版内容的容器
const maskContentGroupEl = useTemplateRef('maskContentGroupEl')
const sharpContentGroupEl = useTemplateRef('sharpContentGroupEl')
const blurredContentGroupEl = useTemplateRef('blurredContentGroupEl')

// --- 响应式计算属性 (Geometry & Sizing) ---
const effectiveSvgWidth = computed(() => props.svgWidth || 1920)
const effectiveSvgHeight = computed(() => props.svgHeight || 300)

// --- 圆弧几何配置 ---
const circleRadius = computed(() => effectiveSvgWidth.value / 2)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)
const circleCenterY = computed(() => {
  const exposedArcAngleDeg = 64
  const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)
  const distCenterToChord = circleRadius.value * Math.cos(exposedArcAngleRad / 2)
  return effectiveSvgHeight.value + distCenterToChord
})

// --- 辅助函数 ---
function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

// --- 核心绘图函数 ---
function plotNodesOnCircle() {
  // 获取蒙版组的引用
  const maskGroup = maskContentGroupEl.value
  const sharpGroup = sharpContentGroupEl.value
  const blurredGroup = blurredContentGroupEl.value
  if (!maskGroup || !sharpGroup || !blurredGroup)
    return // 确保所有组都已挂载

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  const currentTimelineTime = props.currentTimeOffset ?? 0

  // 1. 清空画布：清空所有组的内容
  maskGroup.innerHTML = ''
  sharpGroup.innerHTML = ''
  blurredGroup.innerHTML = ''

  // --- 新增：在左上角绘制一个1像素的圆 ---
  const cornerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  cornerDot.setAttribute('cx', '1')
  cornerDot.setAttribute('cy', '1')
  cornerDot.setAttribute('r', '1')
  cornerDot.setAttribute('fill', 'none')
  sharpGroup.appendChild(cornerDot)

  // 2. 绘制装饰性元素
  const innerArcOffsetFromMain = 30
  const borderArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (borderArcRadius > 0) {
    const blurArcRadius = borderArcRadius + 10
    const angleSpan = Math.PI / 2
    const startAngle = -Math.PI / 2 - angleSpan / 2
    const endAngle = -Math.PI / 2 + angleSpan / 2
    const arcFlags = '0 0 1'

    const x1_blur = currentCircleCenterX + blurArcRadius * Math.cos(startAngle)
    const y1_blur = currentCircleCenterY + blurArcRadius * Math.sin(startAngle)
    const x2_blur = currentCircleCenterX + blurArcRadius * Math.cos(endAngle)
    const y2_blur = currentCircleCenterY + blurArcRadius * Math.sin(endAngle)

    const blurredArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    blurredArcPath.setAttribute('d', `M ${x1_blur} ${y1_blur} A ${blurArcRadius} ${blurArcRadius} ${arcFlags} ${x2_blur} ${y2_blur} Z`)
    blurredArcPath.setAttribute('fill', 'rgba(0, 0, 0, 0.7)')
    blurredArcPath.setAttribute('stroke', 'none')
    blurredGroup.appendChild(blurredArcPath)

    const x1_border = currentCircleCenterX + borderArcRadius * Math.cos(startAngle)
    const y1_border = currentCircleCenterY + borderArcRadius * Math.sin(startAngle)
    const x2_border = currentCircleCenterX + borderArcRadius * Math.cos(endAngle)
    const y2_border = currentCircleCenterY + borderArcRadius * Math.sin(endAngle)

    const innerArcBorder = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcBorder.setAttribute('d', `M ${x1_border} ${y1_border} A ${borderArcRadius} ${borderArcRadius} ${arcFlags} ${x2_border} ${y2_border}`)
    innerArcBorder.setAttribute('stroke', '#999999')
    innerArcBorder.setAttribute('stroke-width', '1')
    innerArcBorder.setAttribute('fill', 'none')
    sharpGroup.appendChild(innerArcBorder)
  }

  // 2.1 绘制主时间轴圆弧 (现在绘制到蒙版中)
  const mainArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const mainArcStartX = currentCircleCenterX - currentCircleRadius
  const mainArcStartY = currentCircleCenterY
  const mainArcEndX = currentCircleCenterX + currentCircleRadius
  const mainArcEndY = currentCircleCenterY
  mainArc.setAttribute('d', `M ${mainArcStartX} ${mainArcStartY} A ${currentCircleRadius} ${currentCircleRadius} 0 0 1 ${mainArcEndX} ${mainArcEndY}`)
  // 在蒙版中，我们用白色笔触来定义可见区域
  mainArc.setAttribute('stroke', '#FFFFFF')
  mainArc.setAttribute('stroke-width', '2')
  mainArc.setAttribute('fill', 'none')
  // 将主弧线添加到蒙版组，而不是清晰内容组
  maskGroup.appendChild(mainArc)

  // 2.2 绘制 "当前时间" 顶部中心标记线
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 5))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 5))
  markerLine.setAttribute('stroke', '#FFFFFF')
  markerLine.setAttribute('stroke-width', '2')
  maskGroup.appendChild(markerLine)

  // 3. 遍历并绘制每个事件节点 (逻辑拆分)
  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2
  const nodeRadius = 6
  const pastNodeInnerDotRadius = 2
  const textOffsetFromNodeEdge = 4

  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 2.5)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 2)
  const animationStartTime = -20
  const animationDuration = 7
  const animationEndTime = animationStartTime + animationDuration

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `Event ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

    // 密度和动画逻辑
    let applicableDensityFactor: number
    if (currentTimelineTime < animationStartTime) {
      applicableDensityFactor = safePastDensityFactor
    }
    else if (currentTimelineTime <= animationEndTime) {
      const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration
      const easedProgress = easeInOutSine(linearProgress)
      applicableDensityFactor = safePastDensityFactor * (1 - easedProgress) + safeFutureDensityFactor * easedProgress
    }
    else {
      applicableDensityFactor = safeFutureDensityFactor
    }

    const angularOffset = (timeRelativeToNow / halfMissionDuration) * Math.PI / applicableDensityFactor
    const angleRad = angularOffset - (Math.PI / 2)

    const nodeCenterX = currentCircleCenterX + currentCircleRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + currentCircleRadius * Math.sin(angleRad)

    if (nodeCenterY < -nodeRadius || nodeCenterY > effectiveSvgHeight.value + nodeRadius)
      continue

    // 3.1 在蒙版上绘制黑色实心圆来 "打孔"
    const maskNodeHole = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    maskNodeHole.setAttribute('cx', String(nodeCenterX))
    maskNodeHole.setAttribute('cy', String(nodeCenterY))
    maskNodeHole.setAttribute('r', String(nodeRadius)) // 使用节点半径
    maskNodeHole.setAttribute('fill', '#000000')
    maskGroup.appendChild(maskNodeHole)

    // 3.2 绘制节点圆环 (前景)
    // 这个圆环会被绘制在被蒙版处理过的弧线之上，从而实现完美的描边效果。
    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeRadius))
    nodeOuterCircle.setAttribute('fill', 'none') // 必须是透明填充
    nodeOuterCircle.setAttribute('stroke', '#FFF') // 边框颜色
    nodeOuterCircle.setAttribute('stroke-width', '1') // 边框宽度
    sharpGroup.appendChild(nodeOuterCircle) // 添加到清晰的前景组

    // 如果是已发生事件，在节点中心绘制一个实心白点
    if (timeRelativeToNow <= 0) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(pastNodeInnerDotRadius))
      innerDotPast.setAttribute('fill', '#FFF')
      sharpGroup.appendChild(innerDotPast)
    }

    // 3.3 绘制文字
    const isOutsideText = i % 2 === 1
    const textDirectionMultiplier = isOutsideText ? 1 : -1

    // 直接计算文字位置
    const totalTextOffset = nodeRadius + textOffsetFromNodeEdge
    const textCenterX = nodeCenterX + textDirectionMultiplier * totalTextOffset * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * totalTextOffset * Math.sin(angleRad)

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.textContent = eventName
    textElement.setAttribute('x', String(textCenterX))
    textElement.setAttribute('y', String(textCenterY))
    textElement.setAttribute('fill', '#fff')
    textElement.setAttribute('font-size', '10px')
    textElement.setAttribute('font-family', 'Saira, sans-serif')
    textElement.setAttribute('font-weight', '600')

    const textRotationDeg = angleRad * (180 / Math.PI) + 90
    textElement.setAttribute('transform', `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`)
    textElement.setAttribute('text-anchor', 'middle')
    textElement.setAttribute('dominant-baseline', isOutsideText ? 'text-after-edge' : 'text-before-edge')

    sharpGroup.appendChild(textElement)
  }
}

// --- Vue 生命周期钩子和侦听器 ---
onMounted(plotNodesOnCircle)
watch(
  () => [
    props.timestamps,
    props.nodeNames,
    props.missionDuration,
    props.currentTimeOffset,
    effectiveSvgWidth.value,
    effectiveSvgHeight.value,
    props.pastNodeDensityFactor,
    props.futureNodeDensityFactor,
  ],
  plotNodesOnCircle,
  {
    deep: true,
    immediate: false,
  },
)
</script>

<template>
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <svg class="w-full" :width="effectiveSvgWidth" :height="effectiveSvgHeight">
      <!-- 定义区: 放置滤镜和蒙版 -->
      <defs>
        <!-- 滤镜 -->
        <filter id="blurMe" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation="50" />
        </filter>

        <mask id="timeline-mask">
          <g ref="maskContentGroupEl" />
        </mask>
      </defs>

      <!--
        绘图层
        注意绘制顺序：底层 -> 顶层
      -->
      <g class="fade-opacity">
        <!-- 1. 模糊背景层 -->
        <g ref="blurredContentGroupEl" filter="url(#blurMe)" />
        <rect x="0" y="0" :width="effectiveSvgWidth" :height="effectiveSvgHeight" fill="white" mask="url(#timeline-mask)" />

        <!-- 3. 清晰前景层 -->
        <!-- 包含: 顶部标记, 节点内部点, 指引线, 文字等。 -->
        <g ref="sharpContentGroupEl" />
      </g>
    </svg>
  </div>
</template>

<style lang="css" scoped>
/* */
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
