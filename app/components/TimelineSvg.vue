<script setup lang="ts">
// components/TimelineSvg.vue

// --- 组件 Props 定义 --- (无变化)
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

// --- 响应式计算属性 (Geometry & Sizing) --- (无变化)
const effectiveSvgWidth = computed(() => props.svgWidth || 1920)
const effectiveSvgHeight = computed(() => props.svgHeight || 300)

// --- 圆弧几何配置 --- (无变化)
const circleRadius = computed(() => effectiveSvgWidth.value / 2)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)
const circleCenterY = computed(() => {
  const exposedArcAngleDeg = 64
  const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)
  const distCenterToChord = circleRadius.value * Math.cos(exposedArcAngleRad / 2)
  return effectiveSvgHeight.value + distCenterToChord
})

// --- 辅助函数 --- (无变化)
function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

// --- 核心绘图函数 (已优化) ---
/**
 * 在 SVG 上绘制所有元素。
 * [优化] 使用 SVG 蒙版技术来实现主时间轴弧线的 "节点镂空" 效果。
 * 1. 在一个不可见的 <mask> 中，绘制白色主弧线和黑色的节点圆 "孔"。
 * 2. 将此蒙版应用到一个白色矩形上，从而只显示出带镂空效果的弧线。
 * 3. 在前景中正常绘制节点的装饰、指引线和文字。
 */
function plotNodesOnCircle() {
  // [新增] 获取蒙版组的引用
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

  // --- 新增：在左上角绘制一个1像素的圆 --- (无变化)
  const cornerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  cornerDot.setAttribute('cx', '1')
  cornerDot.setAttribute('cy', '1')
  cornerDot.setAttribute('r', '1')
  cornerDot.setAttribute('fill', 'none')
  sharpGroup.appendChild(cornerDot)

  // 2. 绘制装饰性元素 (无变化)
  const innerArcOffsetFromMain = 30
  const borderArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (borderArcRadius > 0) {
    const blurArcRadius = borderArcRadius + 20
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
    blurredArcPath.setAttribute('fill', 'rgba(0, 0, 0, 1)')
    blurredArcPath.setAttribute('stroke', 'none')
    blurredGroup.appendChild(blurredArcPath)

    const x1_border = currentCircleCenterX + borderArcRadius * Math.cos(startAngle)
    const y1_border = currentCircleCenterY + borderArcRadius * Math.sin(startAngle)
    const x2_border = currentCircleCenterX + borderArcRadius * Math.cos(endAngle)
    const y2_border = currentCircleCenterY + borderArcRadius * Math.sin(endAngle)

    const innerArcBorder = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcBorder.setAttribute('d', `M ${x1_border} ${y1_border} A ${borderArcRadius} ${borderArcRadius} ${arcFlags} ${x2_border} ${y2_border}`)
    innerArcBorder.setAttribute('stroke', '#808080')
    innerArcBorder.setAttribute('stroke-width', '1')
    innerArcBorder.setAttribute('fill', 'none')
    sharpGroup.appendChild(innerArcBorder)
  }

  // [优化] 2.1 绘制主时间轴圆弧 (现在绘制到蒙版中)
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

  // 2.2 绘制 "当前时间" 顶部中心标记线 (无变化，仍在清晰组)
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 5))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 5))
  markerLine.setAttribute('stroke', '#FFF')
  markerLine.setAttribute('stroke-width', '3')
  // sharpGroup.appendChild(markerLine)
  maskGroup.appendChild(markerLine)

  // 3. 遍历并绘制每个事件节点 (逻辑拆分)
  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2
  const nodeRadius = 6.5
  const pastNodeInnerDotRadius = 2
  const textOffsetFromNodeEdge = 12
  const lineToTextGap = 0

  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 1.0)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 1.0)
  const animationStartTime = -20
  const animationDuration = 7
  const animationEndTime = animationStartTime + animationDuration

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `Event ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

    // 密度和动画逻辑 (无变化)
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

    // [优化] 3.1 在蒙版上绘制黑色实心圆来 "打孔"
    const maskNodeHole = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    maskNodeHole.setAttribute('cx', String(nodeCenterX))
    maskNodeHole.setAttribute('cy', String(nodeCenterY))
    maskNodeHole.setAttribute('r', String(nodeRadius)) // 使用节点半径
    // 在蒙版中，黑色 = 不可见/擦除
    maskNodeHole.setAttribute('fill', '#000000')
    maskGroup.appendChild(maskNodeHole)

    // [新增] 步骤 3.2: 在前景中绘制节点的边框
    // 这个圆环会被绘制在被蒙版处理过的弧线之上，从而实现完美的描边效果。
    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeRadius))
    nodeOuterCircle.setAttribute('fill', 'none') // 必须是透明填充
    nodeOuterCircle.setAttribute('stroke', '#FFF') // 边框颜色
    nodeOuterCircle.setAttribute('stroke-width', '1') // 边框宽度
    sharpGroup.appendChild(nodeOuterCircle) // 添加到清晰的前景组

    // 如果是已发生事件，在节点中心绘制一个实心白点 (无变化，仍在清晰组)
    if (timeRelativeToNow <= 0) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(pastNodeInnerDotRadius))
      innerDotPast.setAttribute('fill', '#FFF')
      sharpGroup.appendChild(innerDotPast)
    }

    // 3.3 绘制指引线和文字 (无变化，仍在清晰组)
    const isOutsideText = i % 2 === 0
    const textDirectionMultiplier = isOutsideText ? 1 : -1

    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeRadius
    if (lineLength < 1)
      continue

    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeRadius * Math.sin(angleRad)
    const lineEndX = nodeCenterX + textDirectionMultiplier * (nodeRadius + lineLength) * Math.cos(angleRad)
    const lineEndY = nodeCenterY + textDirectionMultiplier * (nodeRadius + lineLength) * Math.sin(angleRad)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(lineStartX))
    line.setAttribute('y1', String(lineStartY))
    line.setAttribute('x2', String(lineEndX))
    line.setAttribute('y2', String(lineEndY))
    line.setAttribute('stroke', '#ccc')
    line.setAttribute('stroke-width', '2')
    sharpGroup.appendChild(line)

    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

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

// --- Vue 生命周期钩子和侦听器 --- (无变化)
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
        <!-- 滤镜 (无变化) -->
        <filter id="blurMe" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation="50" />
        </filter>

        <!--
          [新增] SVG 蒙版定义
          - id="timeline-mask": 蒙版的唯一标识符。
          - maskContentGroupEl: 一个空的 <g> 容器，我们的脚本将动态地向其中填充蒙版内容
            (白色的弧线和黑色的节点"孔")。
        -->
        <mask id="timeline-mask">
          <g ref="maskContentGroupEl" />
        </mask>
      </defs>

      <!--
        绘图层
        注意绘制顺序：底层 -> 顶层
      -->
      <g class="fade-opacity">
        <!-- 1. 模糊背景层 (无变化) -->
        <g ref="blurredContentGroupEl" filter="url(#blurMe)" />

        <!--
          [新增] 2. 主时间轴层 (使用蒙版)
          - 我们画一个覆盖整个SVG的白色矩形。
          - `mask="url(#timeline-mask)"` 属性将蒙版应用到这个矩形上。
          - 效果: 矩形只会在蒙版为白色的区域（即我们绘制的带孔弧线）显示出来。
        -->
        <rect x="0" y="0" :width="effectiveSvgWidth" :height="effectiveSvgHeight" fill="white" mask="url(#timeline-mask)" />

        <!-- 3. 清晰前景层 (无变化) -->
        <!-- 包含: 顶部标记, 节点内部点, 指引线, 文字等。 -->
        <g ref="sharpContentGroupEl" />
      </g>
    </svg>
  </div>
</template>

<style lang="css" scoped>
/* (无变化) */
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
