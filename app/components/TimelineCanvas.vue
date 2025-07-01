<script setup lang="ts">
// components/TimelineCanvas.vue
const props = defineProps<{
  timestamps: number[] // 事件的绝对时间戳 (秒), 相对于T-0 (例如: -60, 0, 120)
  nodeNames: string[]
  missionDuration: number // 圆周代表的总时间跨度 (秒)
  currentTimeOffset?: number // 当前时间偏移量 (秒), 从T-0开始计算。T-60s时为-60, T+10s时为10。
  canvasWidth?: number
  canvasHeight?: number
  pastNodeDensityFactor?: number // New: Density for past nodes (e.g., 1.0 default, 2.0 for twice as dense)
  futureNodeDensityFactor?: number // New: Density for future nodes
}>()

const canvasEl = useTemplateRef<HTMLCanvasElement>('canvasEl')

const effectiveCanvasWidth = computed(() => props.canvasWidth || 1200)
const effectiveCanvasHeight = computed(() => props.canvasHeight || 200)

// --- 圆弧几何配置 (与SVG版本相同) ---
const exposedArcAngleDeg = 64
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)

const circleRadius = computed(() => effectiveCanvasWidth.value)

const distCenterToChord = computed(() => {
  return circleRadius.value * Math.cos(exposedArcAngleRad / 2)
})

const circleCenterY = computed(() => effectiveCanvasHeight.value + distCenterToChord.value)
const circleCenterX = computed(() => effectiveCanvasWidth.value / 2)

// Helper function for ease-in-ease-out (与SVG版本相同)
function easeInOutSine(t: number): number {
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

function drawOnCanvas() {
  const canvas = canvasEl.value
  if (!canvas)
    return

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  // 清除旧内容
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  const currentTimelineTime = props.currentTimeOffset ?? 0

  // 装饰圆弧的配置
  const angleSpan = Math.PI / 2 // 90度
  const startAngle = -Math.PI / 2 - angleSpan / 2 // -135度
  const endAngle = -Math.PI / 2 + angleSpan / 2 // -45度

  const innerArcOffsetFromMain = 45
  const outerArcOffsetFromMain = 45
  const innerArcFillColor = 'rgba(0, 0, 0, 0.7)'
  const innerArcStrokeColor = '#808080'
  const innerArcStrokeWidth = 2
  const outerArcFillColor = 'rgba(0, 0, 0, 0.3)'

  // 1. Outer Decorative Arc (绘制为饼图切片形状)
  const outerDecoArcRadius = currentCircleRadius + outerArcOffsetFromMain
  if (outerDecoArcRadius > 0) {
    ctx.beginPath()
    ctx.moveTo(currentCircleCenterX, currentCircleCenterY)
    ctx.arc(currentCircleCenterX, currentCircleCenterY, outerDecoArcRadius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = outerArcFillColor
    ctx.fill()
  }

  // 2. Inner Decorative Arc (绘制为饼图切片形状)
  const innerDecoArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (innerDecoArcRadius > 0) {
    ctx.beginPath()
    ctx.moveTo(currentCircleCenterX, currentCircleCenterY)
    ctx.arc(currentCircleCenterX, currentCircleCenterY, innerDecoArcRadius, startAngle, endAngle)
    ctx.closePath()
    ctx.fillStyle = innerArcFillColor
    ctx.strokeStyle = innerArcStrokeColor
    ctx.lineWidth = innerArcStrokeWidth
    ctx.fill()
    ctx.stroke()
  }

  // 3. 主指示圆弧
  const mainArcRadius = currentCircleRadius
  // 背景圆弧 (灰色完整弧)
  ctx.beginPath()
  ctx.arc(currentCircleCenterX, currentCircleCenterY, mainArcRadius, startAngle, endAngle)
  ctx.strokeStyle = '#aaaaaa'
  ctx.lineWidth = 2
  ctx.stroke()
  // 显示半圆弧 (白色可见弧) - Canvas中从底部到顶部是 PI/2 到 -PI/2 (或3PI/2)
  ctx.beginPath()
  ctx.arc(currentCircleCenterX, currentCircleCenterY, mainArcRadius, Math.PI / 2, -Math.PI / 2, true) // true for counter-clockwise
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.stroke()

  // "当前时间" 标记线
  const markLineY = currentCircleCenterY - currentCircleRadius
  ctx.beginPath()
  ctx.moveTo(currentCircleCenterX, markLineY - 3)
  ctx.lineTo(currentCircleCenterX, markLineY + 3)
  ctx.strokeStyle = '#FFF'
  ctx.lineWidth = 2
  ctx.stroke()

  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2
  const nodeDotRadius = 6.5
  const nodeOuterRadius = 6.5
  const nodeInnerDotRadiusSmall = 3

  const textOffsetFromNodeEdge = 18
  const lineToTextGap = 7

  // --- Density and Animation Logic (与SVG版本相同) ---
  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 1.0)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 1.0)
  const animationStartTime = -20
  const animationDuration = 7
  const animationEndTime = animationStartTime + animationDuration

  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `事件 ${i + 1}`
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

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

    const angularOffsetBase = (timeRelativeToNow / halfMissionDuration) * Math.PI
    const angularOffset = angularOffsetBase / applicableDensityFactor
    const angleRad = angularOffset - (Math.PI / 2) // T=Now at top (-PI/2)

    const nodeCenterX = currentCircleCenterX + mainArcRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + mainArcRadius * Math.sin(angleRad)

    const isVisibleVertically = nodeCenterY >= -nodeOuterRadius && nodeCenterY <= effectiveCanvasHeight.value + nodeOuterRadius
    if (!isVisibleVertically)
      continue

    // 绘制节点外圆
    ctx.beginPath()
    ctx.arc(nodeCenterX, nodeCenterY, nodeOuterRadius, 0, 2 * Math.PI)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.strokeStyle = '#FFF'
    ctx.lineWidth = 1.8
    ctx.stroke()

    // 绘制已发生事件的内点
    if (timeRelativeToNow <= 0) {
      ctx.beginPath()
      ctx.arc(nodeCenterX, nodeCenterY, nodeInnerDotRadiusSmall, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFF'
      ctx.fill()
    }

    const isOutsideText = i % 2 === 0
    const textDirectionMultiplier = isOutsideText ? 1 : -1
    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad)
    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
    if (lineLength < 1)
      continue

    // 绘制连接线
    const lineEndX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.cos(angleRad)
    const lineEndY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.sin(angleRad)
    ctx.beginPath()
    ctx.moveTo(lineStartX, lineStartY)
    ctx.lineTo(lineEndX, lineEndY)
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 2
    ctx.stroke()

    // --- 绘制文本 (Canvas版本核心改动) ---
    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

    ctx.save() // 保存当前坐标系状态

    // 1. 移动并旋转坐标系
    ctx.translate(textCenterX, textCenterY)
    ctx.rotate(angleRad + Math.PI / 2) // 旋转角度与SVG版本保持一致

    // 2. 设置文本属性
    ctx.fillStyle = '#fff'
    ctx.font = '500 10px Saira'
    ctx.textAlign = 'center' // 对应SVG的 text-anchor="middle"
    // 模拟 alignment-baseline
    ctx.textBaseline = isOutsideText ? 'bottom' : 'top'

    // 3. 处理多行文本
    const words = eventName.split(' ')
    const numLines = words.length
    const lineHeight = 12 // 10px font-size * 1.2 line-height

    // 计算多行文本的起始Y偏移量，使其整体居中
    const startY = -((numLines - 1) / 2) * lineHeight

    words.forEach((word, index) => {
      const yPos = startY + (index * lineHeight)
      // 因为已经 translate, 所以 x 坐标为 0
      ctx.fillText(word, 0, yPos)
    })

    ctx.restore() // 恢复坐标系，以便下一个节点的绘制不受影响
  }
}

onMounted(() => {
  drawOnCanvas()
})

// watch的逻辑与SVG版本几乎相同，只是调用了新的绘图函数
watch(
  () => [
    props.timestamps,
    props.nodeNames,
    props.missionDuration,
    props.currentTimeOffset,
    effectiveCanvasWidth.value,
    effectiveCanvasHeight.value,
    props.pastNodeDensityFactor,
    props.futureNodeDensityFactor,
  ],
  () => {
    drawOnCanvas()
  },
  { deep: true, immediate: false },
)
</script>

<template>
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <!-- 使用 canvas 标签 -->
    <canvas
      ref="canvasEl"
      class="w-full"
      :width="effectiveCanvasWidth"
      :height="effectiveCanvasHeight"
    />
  </div>
</template>
