<script setup lang="ts">
// components/TimelineSvg.vue
const props = defineProps<{
  timestamps: number[] // 事件的绝对时间戳 (秒), 相对于T-0 (例如: -60, 0, 120)
  nodeNames: string[]
  missionDuration: number // SVG 圆周代表的总时间跨度 (秒)
  currentTimeOffset?: number // 当前时间偏移量 (秒), 从T-0开始计算。T-60s时为-60, T+10s时为10。
  svgWidth?: number
  svgHeight?: number
}>()

const svgEl = ref<SVGElement | null>(null)

const effectiveSvgWidth = computed(() => props.svgWidth || 1200)
const effectiveSvgHeight = computed(() => props.svgHeight || 200)

// --- 圆弧几何配置 ---
// 圆弧半径，这里我们让它与SVG视口宽度相关，可以调整比例系数来改变曲率
const exposedArcAngleDeg = 60 // The desired visible arc at the top of the SVG in degrees
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)

const circleRadius = computed(() => effectiveSvgWidth.value / 2)

const distCenterToChord = computed(() => {
  return circleRadius.value * Math.cos(exposedArcAngleRad / 2)
})
// 圆心Y坐标。我们希望圆弧的顶部（对应T-0或当前时间）在SVG视口的y=0附近。
// 如果圆心 (cx, R)，则圆弧顶部在 (cx, 0)，SVG y轴向下为正。
const circleCenterY = computed(() => props.svgHeight! + distCenterToChord.value)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)
function plotNodesOnCircle() {
  const svg = svgEl.value
  if (!svg)
    return

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  // currentTimeOffset: T-60s时值为-60, T-0时为0, T+60s时为60
  const currentTimelineTime = props.currentTimeOffset ?? 0

  svg.innerHTML = '' // 清除旧内容

  // --- Configuration for new decorative arcs ---

  const arcRadius = currentCircleRadius
  // 定义圆弧的起点和终点角度（例如，覆盖整个SVG宽度）
  const angleSpan = Math.PI / 2 // 决定圆弧的张开程度
  const startAngle = -Math.PI / 2 - angleSpan / 2
  const endAngle = -Math.PI / 2 + angleSpan / 2
  // For SVG arc path: large-arc-flag=0 (arc span < 180deg), sweep-flag=1 (positive angle direction)
  const arcDrawingFlags = '0 0 1'

  const innerArcOffsetFromMain = 40 // Configurable: Distance *inside* the main arc
  const outerArcOffsetFromMain = 40 // Configurable: Distance *outside* the main arc

  const innerArcFillColor = 'rgba(0, 0, 0, 0.7)' // Black with 30% opacity for inner arc fill
  const innerArcStrokeColor = '#808080' // Grey for inner arc stroke
  const innerArcStrokeWidth = '1' // Stroke width for inner arc

  const outerArcFillColor = 'rgba(0, 0, 0, 0.3)' // Black with 10% opacity for outer arc fill

  // 1. Outer Decorative Arc (black fill, 10% transparent)
  // This arc is drawn as a filled segment (arc path closed with 'Z').
  const outerDecoArcRadius = currentCircleRadius + outerArcOffsetFromMain
  if (outerDecoArcRadius > 0) { // Ensure radius is positive
    const x1_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(startAngle)
    const y1_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(startAngle)
    const x2_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(endAngle)
    const y2_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(endAngle)

    const outerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    // 'Z' closes the path by drawing a line from end to start, allowing fill of the segment.
    outerArcPath.setAttribute('d', `M ${x1_outer} ${y1_outer} A ${outerDecoArcRadius} ${outerDecoArcRadius} ${arcDrawingFlags} ${x2_outer} ${y2_outer} Z`)
    outerArcPath.setAttribute('fill', outerArcFillColor)
    outerArcPath.setAttribute('stroke', 'none') // No stroke for the outer decorative arc
    svg.appendChild(outerArcPath)
  }

  // 2. Inner Decorative Arc (grey stroke, black fill with custom transparency)
  // This arc is also drawn as a filled segment.
  const innerDecoArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (innerDecoArcRadius > 0) { // Ensure radius is positive
    const x1_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(startAngle)
    const y1_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(startAngle)
    const x2_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(endAngle)
    const y2_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(endAngle)

    const innerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcPath.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner} Z`)
    innerArcPath.setAttribute('fill', innerArcFillColor)
    innerArcPath.setAttribute('stroke', innerArcStrokeColor)
    innerArcPath.setAttribute('stroke-width', innerArcStrokeWidth)
    svg.appendChild(innerArcPath)
  }

  // 主指示圆弧
  const mainArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const x1 = currentCircleCenterX + arcRadius * Math.cos(startAngle)
  const y1 = currentCircleCenterY + arcRadius * Math.sin(startAngle)
  const x2 = currentCircleCenterX + arcRadius * Math.cos(endAngle)
  const y2 = currentCircleCenterY + arcRadius * Math.sin(endAngle)
  mainArc.setAttribute('d', `M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 1 ${x2} ${y2}`)
  mainArc.setAttribute('stroke', '#FFFFFF90')
  mainArc.setAttribute('stroke-width', '2')
  mainArc.setAttribute('fill', 'none')
  svg.appendChild(mainArc)

  // "当前时间" 标记线 (垂直线在SVG顶部中心)
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 3))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 3))
  markerLine.setAttribute('stroke', '#FFF') // 亮蓝色标记
  markerLine.setAttribute('stroke-width', '2')
  svg.appendChild(markerLine)

  // const markerText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  // markerText.setAttribute('x', String(currentCircleCenterX + 8))
  // markerText.setAttribute('y', String(12))
  // markerText.setAttribute('fill', '#00c0ff')
  // markerText.setAttribute('font-size', '10px')
  // markerText.setAttribute('font-family', 'monospace')
  // markerText.textContent = 'NOW'
  // svg.appendChild(markerText)

  const numEvents = props.timestamps.length
  // missionDuration 是 SVG 圆周所代表的总时间。T-0 (NOW) 在顶部中心。
  // 节点根据其 (eventTime - currentTimelineTime) 的值来定位。
  const halfMissionDuration = props.missionDuration / 2
  const nodeDotRadius = 5
  const nodeOuterRadius = 5 // 外圆圈的半径
  const nodeInnerDotRadiusSmall = 2.5 // 过去事件的内点半径
  const nodeInnerDotRadiusLarge = 3// 接近NOW标记的内点半径 (高亮)

  const textOffsetFromNodeEdge = 18
  const lineToTextGap = 7

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `事件 ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime
    const angleRad = (timeRelativeToNow / halfMissionDuration) * Math.PI - (Math.PI / 2)

    const nodeCenterX = currentCircleCenterX + currentCircleRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + currentCircleRadius * Math.sin(angleRad)

    const isVisibleVertically = nodeCenterY >= -nodeOuterRadius && nodeCenterY <= effectiveSvgHeight.value + nodeOuterRadius
    if (!isVisibleVertically)
      continue

    // 1. 绘制所有节点的白色外圆圈 (描边，无填充)
    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeOuterRadius))
    nodeOuterCircle.setAttribute('fill', '#000') // 无填充
    nodeOuterCircle.setAttribute('stroke', '#FFF') // 白色描边
    nodeOuterCircle.setAttribute('stroke-width', '1.5') // 描边宽度
    svg.appendChild(nodeOuterCircle)

    // 2. 根据状态绘制内部的实心点
    if (Math.abs(timeRelativeToNow) <= 2) { // 2秒内接近NOW标记
      const innerDotActive = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotActive.setAttribute('cx', String(nodeCenterX))
      innerDotActive.setAttribute('cy', String(nodeCenterY))
      innerDotActive.setAttribute('r', String(nodeInnerDotRadiusLarge))
      innerDotActive.setAttribute('fill', '#FFF') // 高亮颜色 (例如亮蓝色)
      // innerDotActive.setAttribute('stroke', 'none'); // 通常不需要描边
      svg.appendChild(innerDotActive)
    }
    else if (timeRelativeToNow < -2) { // 过去事件 (早于-2秒)
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(nodeInnerDotRadiusSmall))
      innerDotPast.setAttribute('fill', '#FFF') // 白色实心点
      // innerDotPast.setAttribute('stroke', 'none');
      svg.appendChild(innerDotPast)
    }
    // 对于 timeRelativeToNow > 2 (未来事件)，不绘制内部点，保持为空心圆圈

    // 绘制连接线和文字 (内外分布)
    const isOutsideText = i % 2 === 0 // 交替内外放置文字
    const textDirectionMultiplier = isOutsideText ? 1 : -1

    // 线条起点 (节点圆点边缘)
    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad)

    // 线条长度
    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
    if (lineLength < 1)
      continue // 线太短不绘制

    // 线条终点
    const lineEndX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.cos(angleRad)
    const lineEndY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.sin(angleRad)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(lineStartX))
    line.setAttribute('y1', String(lineStartY))
    line.setAttribute('x2', String(lineEndX))
    line.setAttribute('y2', String(lineEndY))
    line.setAttribute('stroke', '#ccc')
    line.setAttribute('stroke-width', '2.5')
    svg.appendChild(line)

    // 文字中心点
    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.setAttribute('x', String(textCenterX))
    textElement.setAttribute('y', String(textCenterY))

    // 文字旋转使其与径向线垂直 (切向)
    const textRotationDeg = angleRad * (180 / Math.PI) + 90 // 转换为度并加90度
    textElement.setAttribute('transform', `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`)

    textElement.setAttribute('text-anchor', 'middle')
    textElement.setAttribute('dy', '0.35em') // 近似垂直居中
    textElement.setAttribute('fill', '#fff')
    textElement.setAttribute('font-size', '10px')
    textElement.setAttribute('font-family', 'sans-serif')
    textElement.setAttribute('font-weight', 'bold')
    textElement.textContent = eventName
    svg.appendChild(textElement)
  }
}

onMounted(() => {
  plotNodesOnCircle()
})

watch(
  () => [
    props.timestamps,
    props.nodeNames,
    props.missionDuration,
    props.currentTimeOffset, // 关键：监听此项以实现动态更新
    effectiveSvgWidth.value,
    effectiveSvgHeight.value,
  ],
  () => {
    plotNodesOnCircle()
  },
  { deep: true, immediate: false }, // immediate:false 避免与onMounted重复调用，deep用于数组/对象
)
</script>

<template>
  <div class="canvas_wrapper">
    <div class="flex justify-center">
      <!-- eslint-disable-next-line vue/html-self-closing -->
      <svg ref="svgEl" :width="effectiveSvgWidth" :height="effectiveSvgHeight"></svg>
    </div>
  </div>
</template>

<style lang="css" scoped>
.canvas_wrapper {
  background: #00000000;
  color: #fff;
  clip-path: inset(0 -100vmax);
  height: 200px; /* This might be dynamic or better handled */
  overflow: hidden;
  position: absolute;
  bottom: 0;
}
</style>
