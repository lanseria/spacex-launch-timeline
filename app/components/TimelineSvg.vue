<script setup lang="ts">
// components/TimelineSvg.vue
const props = defineProps<{
  timestamps: number[] // 事件的绝对时间戳 (秒), 相对于T-0 (例如: -60, 0, 120)
  nodeNames: string[]
  missionDuration: number // SVG 圆周代表的总时间跨度 (秒)
  currentTimeOffset?: number // 当前时间偏移量 (秒), 从T-0开始计算。T-60s时为-60, T+10s时为10。
  svgWidth?: number
  svgHeight?: number
  pastNodeDensityFactor?: number // New: Density for past nodes (e.g., 1.0 default, 2.0 for twice as dense)
  futureNodeDensityFactor?: number // New: Density for future nodes
}>()

const svgEl = useTemplateRef('svgEl')

const effectiveSvgWidth = computed(() => props.svgWidth || 1200)
const effectiveSvgHeight = computed(() => props.svgHeight || 200)

// --- 圆弧几何配置 ---
const exposedArcAngleDeg = 60
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)

const circleRadius = computed(() => effectiveSvgWidth.value / 2)

const distCenterToChord = computed(() => {
  return circleRadius.value * Math.cos(exposedArcAngleRad / 2)
})

// Using effectiveSvgHeight for robustness as it includes the default
const circleCenterY = computed(() => effectiveSvgHeight.value + distCenterToChord.value)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)

function plotNodesOnCircle() {
  const svg = svgEl.value
  if (!svg)
    return

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  const currentTimelineTime = props.currentTimeOffset ?? 0

  svg.innerHTML = '' // 清除旧内容

  const mainArcRadius = currentCircleRadius
  const angleSpan = Math.PI / 2
  const startAngle = -Math.PI / 2 - angleSpan / 2
  const endAngle = -Math.PI / 2 + angleSpan / 2
  const arcDrawingFlags = '0 0 1'

  const innerArcOffsetFromMain = 40
  const outerArcOffsetFromMain = 40
  const innerArcFillColor = 'rgba(0, 0, 0, 0.7)'
  const innerArcStrokeColor = '#808080'
  const innerArcStrokeWidth = '2'
  const outerArcFillColor = 'rgba(0, 0, 0, 0.3)'

  // 1. Outer Decorative Arc
  const outerDecoArcRadius = currentCircleRadius + outerArcOffsetFromMain
  if (outerDecoArcRadius > 0) {
    const x1_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(startAngle)
    const y1_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(startAngle)
    const x2_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(endAngle)
    const y2_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(endAngle)
    const outerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    outerArcPath.setAttribute('d', `M ${x1_outer} ${y1_outer} A ${outerDecoArcRadius} ${outerDecoArcRadius} ${arcDrawingFlags} ${x2_outer} ${y2_outer} Z`)
    outerArcPath.setAttribute('fill', outerArcFillColor)
    outerArcPath.setAttribute('stroke', 'none')
    svg.appendChild(outerArcPath)
  }

  // 2. Inner Decorative Arc
  const innerDecoArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (innerDecoArcRadius > 0) {
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

  // 3. 主指示圆弧
  const mainArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const x1 = currentCircleCenterX + mainArcRadius * Math.cos(startAngle)
  const y1 = currentCircleCenterY + mainArcRadius * Math.sin(startAngle)
  const x2 = currentCircleCenterX + mainArcRadius * Math.cos(endAngle)
  const y2 = currentCircleCenterY + mainArcRadius * Math.sin(endAngle)
  mainArc.setAttribute('d', `M ${x1} ${y1} A ${mainArcRadius} ${mainArcRadius} 0 0 1 ${x2} ${y2}`)
  mainArc.setAttribute('stroke', '#FFFFFF')
  mainArc.setAttribute('stroke-width', '2')
  mainArc.setAttribute('fill', 'none')
  svg.appendChild(mainArc)

  // "当前时间" 标记线
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 3))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 3))
  markerLine.setAttribute('stroke', '#FFF')
  markerLine.setAttribute('stroke-width', '2')
  svg.appendChild(markerLine)

  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2
  const nodeDotRadius = 6
  const nodeOuterRadius = 6
  const nodeInnerDotRadiusSmall = 3
  const nodeInnerDotRadiusLarge = 3.5

  const textOffsetFromNodeEdge = 18
  const lineToTextGap = 7

  // --- Density and Animation Logic ---
  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 1.0)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 1.0)

  const animationStartTime = -7 // Start animation at T-7s
  const animationDuration = 6 // Animation lasts 5 seconds
  const animationEndTime = animationStartTime + animationDuration

  // Determine the target density for events that are currently in the "past" slots
  let targetDensityForPastSlots: number
  if (currentTimelineTime >= animationStartTime && currentTimelineTime <= animationEndTime) {
    // During animation: interpolate from past density to future density
    const progress = (currentTimelineTime - animationStartTime) / animationDuration
    targetDensityForPastSlots = safePastDensityFactor * (1 - progress) + safeFutureDensityFactor * progress
  }
  else if (currentTimelineTime > animationEndTime) {
    // After animation: past slots use future density
    targetDensityForPastSlots = safeFutureDensityFactor
  }
  else { // currentTimelineTime < animationStartTime
    // Before animation starts: past slots use the high past density
    targetDensityForPastSlots = safePastDensityFactor
  }

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `事件 ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

    let applicableDensityFactor: number

    if (currentTimelineTime < animationStartTime) {
      // ---- Behavior before -20s ----
      // ALL nodes (regardless of being past or future relative to currentTimelineTime) use the high density factor.
      applicableDensityFactor = safePastDensityFactor
    }
    else {
      // ---- Behavior at or after -20s ----
      // Density depends on whether the node is in the past or future *relative to currentTimelineTime*.
      if (timeRelativeToNow < 0) { // Event is in the past
        applicableDensityFactor = targetDensityForPastSlots
      }
      else { // Event is in the future or at NOW
        applicableDensityFactor = safeFutureDensityFactor
      }
    }

    const angularOffsetBase = (timeRelativeToNow / halfMissionDuration) * Math.PI
    const angularOffset = angularOffsetBase / applicableDensityFactor
    const angleRad = angularOffset - (Math.PI / 2)

    const nodeCenterX = currentCircleCenterX + mainArcRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + mainArcRadius * Math.sin(angleRad)

    const isVisibleVertically = nodeCenterY >= -nodeOuterRadius && nodeCenterY <= effectiveSvgHeight.value + nodeOuterRadius
    if (!isVisibleVertically)
      continue

    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeOuterRadius))
    nodeOuterCircle.setAttribute('fill', '#000')
    nodeOuterCircle.setAttribute('stroke', '#FFF')
    nodeOuterCircle.setAttribute('stroke-width', '1.5')
    svg.appendChild(nodeOuterCircle)

    if (Math.abs(timeRelativeToNow) <= 2) {
      const innerDotActive = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotActive.setAttribute('cx', String(nodeCenterX))
      innerDotActive.setAttribute('cy', String(nodeCenterY))
      innerDotActive.setAttribute('r', String(nodeInnerDotRadiusLarge))
      innerDotActive.setAttribute('fill', '#FFF')
      svg.appendChild(innerDotActive)
    }
    else if (timeRelativeToNow < -2) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(nodeInnerDotRadiusSmall))
      innerDotPast.setAttribute('fill', '#FFF')
      svg.appendChild(innerDotPast)
    }

    const isOutsideText = i % 2 === 0
    const textDirectionMultiplier = isOutsideText ? 1 : -1
    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad)
    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
    if (lineLength < 1)
      continue

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

    // 文字中心点 (This part remains the same)
    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.setAttribute('x', String(textCenterX))
    textElement.setAttribute('y', String(textCenterY)) // Y is the geometric center of the text block

    const textRotationDeg = angleRad * (180 / Math.PI) + 90
    textElement.setAttribute('transform', `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`)

    textElement.setAttribute('text-anchor', 'middle') // Horizontally centers the text
    textElement.setAttribute('alignment-baseline', isOutsideText ? 'text-before-edge' : 'text-after-edge') // Horizontally centers the text
    // dominant-baseline="central" makes the y attribute the true vertical center of the text content.
    // This helps in centering the multi-line block.
    textElement.setAttribute('dominant-baseline', isOutsideText ? 'text-after-edge' : 'text-before-edge')
    textElement.setAttribute('fill', '#fff')
    textElement.setAttribute('font-size', '10px') // Assuming 10px font size
    textElement.setAttribute('font-family', 'Saira')
    textElement.setAttribute('font-weight', '400')
    // textElement.textContent = eventName; // We will use tspans instead

    const words = eventName.split(' ')
    const numLines = words.length
    const lineHeightEm = 1.2 // Factor for line height (e.g., 1.2 * font-size)

    if (numLines > 0) {
      words.forEach((word, index) => {
        // Optional: Skip creating tspan for empty words if eventName might have multiple spaces
        // e.g. if (word === "" && numLines > 1) return;

        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        // Each tspan needs its own x attribute for text-anchor="middle" to apply correctly per line
        tspan.setAttribute('x', String(textCenterX))
        tspan.textContent = word

        if (index === 0) {
          // For the first line, calculate dy to position the start of the text block
          // such that the entire block is centered around textCenterY.
          // (numLines - 1) / 2 gives the number of line heights from the center to the top/bottom edge of the block.
          const firstLineDy = -((numLines - 1) / 2) * lineHeightEm
          tspan.setAttribute('dy', `${firstLineDy}em`)
        }
        else {
          // Subsequent lines are positioned relative to the previous line.
          tspan.setAttribute('dy', `${lineHeightEm}em`)
        }
        textElement.appendChild(tspan)
      })
    }
    // If eventName could be empty and numLines is 0, textElement would be empty.
    // This is generally fine.

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
    props.currentTimeOffset,
    effectiveSvgWidth.value,
    effectiveSvgHeight.value,
    props.pastNodeDensityFactor,
    props.futureNodeDensityFactor,
  ],
  () => {
    plotNodesOnCircle()
  },
  { deep: true, immediate: false },
)
</script>

<template>
  <div class="canvas_wrapper flex w-full bottom-0 justify-center absolute overflow-hidden">
    >
    <!-- eslint-disable-next-line vue/html-self-closing -->
    <svg ref="svgEl" class="w-full" :width="effectiveSvgWidth" :height="effectiveSvgHeight"></svg>
  </div>
</template>

<style lang="css" scoped>
.canvas_wrapper {
  clip-path: inset(0 -100vmax);
  height: 200px; /* This might be dynamic or better handled */
}
</style>
