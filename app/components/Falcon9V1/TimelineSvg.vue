<script setup lang="ts">
// components/TimelineSvg.vue
// defineProps 用于声明组件的输入属性 (props)
const props = defineProps<{
  // 事件的时间戳数组 (单位: 秒)。这些时间是相对于 T-0 的绝对时间。
  // 例如: T-60秒为 -60, T-0时刻为 0, T+120秒为 120。
  timestamps: number[]
  // 与时间戳对应的事件名称数组。
  nodeNames: string[]
  // SVG 圆周所代表的总时间跨度 (单位: 秒)。
  // 例如，如果设置为 3600，则整个圆代表一个小时。
  missionDuration: number
  // 当前时间相对于 T-0 的偏移量 (单位: 秒)。
  // 例如: T-60s时为 -60, T+10s时为 10。这个值会动态变化，驱动整个时间轴的动画。
  currentTimeOffset?: number
  // SVG 画布的宽度，可选，有默认值。
  svgWidth?: number
  // SVG 画布的高度，可选，有默认值。
  svgHeight?: number
  // 过去事件节点的密度因子。值越大，节点间距越小（越密集）。用于实现视觉上的压缩效果。
  pastNodeDensityFactor?: number
  // 未来事件节点的密度因子。值越大，节点间距越小。
  futureNodeDensityFactor?: number
}>()

// --- 模板引用 ---
// 获取模板中用于动态内容的 <g> 容器的引用
const contentGroupEl = useTemplateRef('contentGroupEl')

// --- 响应式计算属性 ---
// 计算有效的SVG宽度和高度，如果 props 未提供，则使用默认值。
const effectiveSvgWidth = computed(() => props.svgWidth || 1920)
const effectiveSvgHeight = computed(() => props.svgHeight || 300)

// --- 圆弧几何配置 ---
// 定义了圆弧在SVG画布中可见部分的张开角度（度）。
const exposedArcAngleDeg = 64
// 将张开角度从度转换为弧度，以便用于三角函数计算。
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)

// 计算主圆弧的半径，使其等于SVG宽度的一半。
const circleRadius = computed(() => effectiveSvgWidth.value / 2)

// 计算从圆心到可见圆弧弦的垂直距离。
// 这个值用于确定圆心的 Y 坐标，从而将圆的大部分置于画布之外。
const distCenterToChord = computed(() => {
  return circleRadius.value * Math.cos(exposedArcAngleRad / 2)
})

// 计算圆心的 Y 坐标。通过将画布高度与弦距相加，将圆心向下移动，只露出顶部的一段圆弧。
const circleCenterY = computed(() => effectiveSvgHeight.value + distCenterToChord.value)
// 计算圆心的 X 坐标，使其位于SVG画布水平中心。
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)

// --- 辅助函数 ---
// 一个标准的 "缓入缓出" (ease-in-out) 动画函数。
// 输入 t 的范围是 0 到 1，输出一个平滑过渡的值，也是在 0 到 1 之间。
function easeInOutSine(t: number): number {
  // 确保 t 被限制在 [0, 1] 区间内。
  const clampedT = Math.max(0, Math.min(1, t))
  return 0.5 * (1 - Math.cos(Math.PI * clampedT))
}

// --- 核心绘图函数 ---
// 此函数负责在SVG上绘制所有元素：圆弧、节点、线条和文字。
function plotNodesOnCircle() {
  // 使用对 <g> 容器的引用作为绘图目标
  const group = contentGroupEl.value
  if (!group)
    return // 如果容器还未挂载，则退出。

  // 获取当前计算出的几何属性值
  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value
  const currentTimelineTime = props.currentTimeOffset ?? 0 // 如果未提供当前时间，默认为 T-0。

  // 在每次重绘之前，清空SVG内部的所有旧元素。
  group.innerHTML = ''

  // --- 装饰性圆弧的通用参数 ---
  const mainArcRadius = currentCircleRadius // 主时间轴圆弧的半径
  const angleSpan = Math.PI / 2 // 装饰性圆弧的张角（90度）
  const startAngle = -Math.PI / 2 - angleSpan / 2 // 起始角度
  const endAngle = -Math.PI / 2 + angleSpan / 2 // 结束角度
  const arcDrawingFlags = '0 0 1' // SVG 弧形路径参数：非大弧、顺时针

  const innerArcOffsetFromMain = 45 // 内层装饰弧与主弧的距离
  const outerArcOffsetFromMain = 45 // 外层装饰弧与主弧的距离
  const innerArcFillColor = 'rgba(0, 0, 0, 0.7)' // 内弧填充色
  const innerArcStrokeColor = '#808080' // 内弧描边色
  const innerArcStrokeWidth = '2' // 内弧描边宽度
  const outerArcFillColor = 'rgba(0, 0, 0, 0.3)' // 外弧填充色

  // 1. 绘制外层装饰性圆弧 (一个扇形)
  const outerDecoArcRadius = currentCircleRadius + outerArcOffsetFromMain
  if (outerDecoArcRadius > 0) {
    const x1_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(startAngle)
    const y1_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(startAngle)
    const x2_outer = currentCircleCenterX + outerDecoArcRadius * Math.cos(endAngle)
    const y2_outer = currentCircleCenterY + outerDecoArcRadius * Math.sin(endAngle)
    const outerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    // d属性定义路径：M = 移动到起点, A = 绘制圆弧, Z = 闭合路径形成扇形
    outerArcPath.setAttribute('d', `M ${x1_outer} ${y1_outer} A ${outerDecoArcRadius} ${outerDecoArcRadius} ${arcDrawingFlags} ${x2_outer} ${y2_outer} Z`)
    outerArcPath.setAttribute('fill', outerArcFillColor)
    outerArcPath.setAttribute('stroke', 'none')
    group.appendChild(outerArcPath)
  }

  // 2. 绘制内层装饰性圆弧 (一个扇形)
  const innerDecoArcRadius = currentCircleRadius - innerArcOffsetFromMain
  if (innerDecoArcRadius > 0) {
    const x1_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(startAngle)
    const y1_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(startAngle)
    const x2_inner = currentCircleCenterX + innerDecoArcRadius * Math.cos(endAngle)
    const y2_inner = currentCircleCenterY + innerDecoArcRadius * Math.sin(endAngle)
    const innerArcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcPath.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner} Z`)
    innerArcPath.setAttribute('fill', innerArcFillColor)
    innerArcPath.setAttribute('stroke', 'none')
    const innerArcBorder = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    innerArcBorder.setAttribute('d', `M ${x1_inner} ${y1_inner} A ${innerDecoArcRadius} ${innerDecoArcRadius} ${arcDrawingFlags} ${x2_inner} ${y2_inner}`)
    innerArcBorder.setAttribute('stroke', innerArcStrokeColor)
    innerArcBorder.setAttribute('stroke-width', innerArcStrokeWidth)
    innerArcBorder.setAttribute('fill', 'none')
    // --- 修改：将所有元素添加到分组中 ---
    group.appendChild(innerArcPath)
    group.appendChild(innerArcBorder)
  }

  // 3. 绘制主时间轴圆弧
  // 3.1 背景圆弧 (灰色，作为轨迹基线)
  const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const bg_x1 = currentCircleCenterX + mainArcRadius * Math.cos(startAngle)
  const bg_y1 = currentCircleCenterY + mainArcRadius * Math.sin(startAngle)
  const bg_x2 = currentCircleCenterX + mainArcRadius * Math.cos(endAngle)
  const bg_y2 = currentCircleCenterY + mainArcRadius * Math.sin(endAngle)
  bgArc.setAttribute('d', `M ${bg_x1} ${bg_y1} A ${mainArcRadius} ${mainArcRadius} ${arcDrawingFlags} ${bg_x2} ${bg_y2}`)
  bgArc.setAttribute('stroke', '#aaaaaa')
  bgArc.setAttribute('stroke-width', '2')
  bgArc.setAttribute('fill', 'none')
  group.appendChild(bgArc)
  // 3.2 可见的主圆弧 (白色，节点将位于其上)
  // 这段代码绘制了一个从右到左的半圆，但因为圆心在画布下方，所以看起来是一段弧。
  const mainArc = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  const x1 = currentCircleCenterX + mainArcRadius * Math.cos(startAngle)
  const y1 = currentCircleCenterY + mainArcRadius * Math.sin(startAngle)
  const x2 = currentCircleCenterX + mainArcRadius * Math.cos(-Math.PI / 2) // 左侧点 (9点钟方向)
  const y2 = currentCircleCenterY + mainArcRadius * Math.sin(-Math.PI / 2)
  mainArc.setAttribute('d', `M ${x1} ${y1} A ${mainArcRadius} ${mainArcRadius} ${arcDrawingFlags} ${x2} ${y2}`)
  mainArc.setAttribute('stroke', '#FFFFFF')
  mainArc.setAttribute('stroke-width', '2')
  mainArc.setAttribute('fill', 'none')
  group.appendChild(mainArc)

  // 4. 绘制 "当前时间" 标记线 (位于顶部中央的短竖线)
  const markerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  const markLineY = currentCircleCenterY - currentCircleRadius // 圆弧的最高点
  markerLine.setAttribute('x1', String(currentCircleCenterX))
  markerLine.setAttribute('y1', String(markLineY - 3))
  markerLine.setAttribute('x2', String(currentCircleCenterX))
  markerLine.setAttribute('y2', String(markLineY + 3))
  markerLine.setAttribute('stroke', '#FFF')
  markerLine.setAttribute('stroke-width', '2')
  group.appendChild(markerLine)

  // --- 节点绘制参数 ---
  const numEvents = props.timestamps.length
  const halfMissionDuration = props.missionDuration / 2 // 使用半周期时长来映射到半圆 (PI弧度)
  const nodeDotRadius = 6.5 // 节点外圆半径
  const nodeOuterRadius = 6.5 // 用于可见性判断的半径
  const nodeInnerDotRadiusSmall = 3 // 过去事件节点内部的小白点半径

  const textOffsetFromNodeEdge = 18 // 文本离节点边缘的总距离
  const lineToTextGap = 7 // 指引线末端与文本之间的间隙

  // --- 密度和动画逻辑 ---
  // 使用安全的密度因子，避免值为0或负数。
  const safePastDensityFactor = Math.max(0.1, props.pastNodeDensityFactor ?? 2.0)
  const safeFutureDensityFactor = Math.max(0.1, props.futureNodeDensityFactor ?? 2.0)

  // 定义密度因子切换动画的时间窗口
  const animationStartTime = -20 // 动画在 T-20s 时开始
  const animationDuration = 7 // 动画持续 7 秒
  const animationEndTime = animationStartTime + animationDuration

  // --- 遍历并绘制每个事件节点 ---
  for (let i = 0; i < numEvents; i++) {
    const eventAbsoluteTime = props.timestamps[i]!
    const eventName = props.nodeNames[i] || `事件 ${i + 1}`
    // 计算事件时间相对于 "当前时间" 的差值。
    // 负数表示过去，正数表示未来。
    const timeRelativeToNow = eventAbsoluteTime - currentTimelineTime

    let applicableDensityFactor: number

    // 根据当前时间，决定使用哪个密度因子或进行插值
    if (currentTimelineTime < animationStartTime) {
      // --- 状态1: 动画开始前 (例如 currentTimelineTime < -20s) ---
      // 所有节点都使用 "过去" 的密度因子，视觉上比较稀疏。
      applicableDensityFactor = safePastDensityFactor
    }
    else if (currentTimelineTime >= animationStartTime && currentTimelineTime <= animationEndTime) {
      // --- 状态2: 动画进行中 (例如 -20s <= currentTimelineTime <= -13s) ---
      // 所有节点的密度因子从 "过去" 状态平滑过渡到 "未来" 状态。
      const linearProgress = (currentTimelineTime - animationStartTime) / animationDuration // 线性进度 (0-1)
      const easedProgress = easeInOutSine(linearProgress) // 应用缓动函数，使过渡更自然

      // 线性插值计算当前帧的密度因子
      applicableDensityFactor = safePastDensityFactor * (1 - easedProgress) + safeFutureDensityFactor * easedProgress
    }
    else { // currentTimelineTime > animationEndTime (例如 currentTimelineTime > -13s)
      // --- 状态3: 动画结束后 ---
      // 所有节点都使用 "未来" 的密度因子，视觉上比较密集。
      applicableDensityFactor = safeFutureDensityFactor
    }

    // 将时间差转换为角度。
    // `timeRelativeToNow / halfMissionDuration` 将时间映射到 [-1, 1] 范围 (大致)
    // `* Math.PI` 将其转换为 [-PI, PI] 的弧度范围 (半个圆)
    const angularOffsetBase = (timeRelativeToNow / halfMissionDuration) * Math.PI
    // 应用密度因子来压缩或拉伸角度，实现视觉效果
    const angularOffset = angularOffsetBase / applicableDensityFactor
    // ` - (Math.PI / 2)` 将 0 度（当前时间）旋转到圆弧顶部（-90度或270度方向）
    const angleRad = angularOffset - (Math.PI / 2)

    // 根据角度计算节点圆心的 (x, y) 坐标
    const nodeCenterX = currentCircleCenterX + mainArcRadius * Math.cos(angleRad)
    const nodeCenterY = currentCircleCenterY + mainArcRadius * Math.sin(angleRad)

    // 性能优化：如果节点在垂直方向上完全不可见，则跳过绘制
    const isVisibleVertically = nodeCenterY >= -nodeOuterRadius && nodeCenterY <= effectiveSvgHeight.value + nodeOuterRadius
    if (!isVisibleVertically)
      continue

    // 绘制节点的外圆 (黑底白边)
    const nodeOuterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeOuterCircle.setAttribute('cx', String(nodeCenterX))
    nodeOuterCircle.setAttribute('cy', String(nodeCenterY))
    nodeOuterCircle.setAttribute('r', String(nodeOuterRadius))
    nodeOuterCircle.setAttribute('fill', '#000')
    nodeOuterCircle.setAttribute('stroke', '#FFF')
    nodeOuterCircle.setAttribute('stroke-width', '1.8')
    group.appendChild(nodeOuterCircle)

    // 如果是已发生的事件 (或正在发生的事件)，则在节点中心绘制一个实心白点
    if (timeRelativeToNow <= 0) {
      const innerDotPast = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      innerDotPast.setAttribute('cx', String(nodeCenterX))
      innerDotPast.setAttribute('cy', String(nodeCenterY))
      innerDotPast.setAttribute('r', String(nodeInnerDotRadiusSmall))
      innerDotPast.setAttribute('fill', '#FFF')
      group.appendChild(innerDotPast)
    }

    // --- 绘制指引线和文字 ---
    // 通过索引的奇偶性，交替地将文字放置在主圆弧的内侧和外侧
    const isOutsideText = i % 2 === 1
    const textDirectionMultiplier = isOutsideText ? 1 : -1 // 1 表示向外, -1 表示向内

    // 计算指引线的起点 (在节点边缘)
    const lineStartX = nodeCenterX + textDirectionMultiplier * nodeDotRadius * Math.cos(angleRad)
    const lineStartY = nodeCenterY + textDirectionMultiplier * nodeDotRadius * Math.sin(angleRad)
    const lineLength = textOffsetFromNodeEdge - lineToTextGap - nodeDotRadius
    if (lineLength < 1) // 如果计算出的线长度过短，则不绘制
      continue

    // 计算指引线的终点
    const lineEndX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.cos(angleRad)
    const lineEndY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength) * Math.sin(angleRad)

    // 创建并添加指引线
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(lineStartX))
    line.setAttribute('y1', String(lineStartY))
    line.setAttribute('x2', String(lineEndX))
    line.setAttribute('y2', String(lineEndY))
    line.setAttribute('stroke', '#ccc')
    line.setAttribute('stroke-width', '2')
    group.appendChild(line)

    // 计算文字的中心点 (位于指引线末端外侧一点)
    const textCenterX = nodeCenterX + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.cos(angleRad)
    const textCenterY = nodeCenterY + textDirectionMultiplier * (nodeDotRadius + lineLength + lineToTextGap) * Math.sin(angleRad)

    // 创建 <text> 元素
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElement.setAttribute('x', String(textCenterX))
    textElement.setAttribute('y', String(textCenterY))

    // 计算旋转角度，使文字方向与径向线垂直
    const textRotationDeg = angleRad * (180 / Math.PI) + 90
    textElement.setAttribute('transform', `rotate(${textRotationDeg}, ${textCenterX}, ${textCenterY})`)

    // 设置文本对齐方式，使其以自身中心为锚点，并根据内外位置调整垂直对齐基线
    textElement.setAttribute('text-anchor', 'middle') // 水平居中
    textElement.setAttribute('dominant-baseline', isOutsideText ? 'text-after-edge' : 'text-before-edge') // 垂直对齐
    textElement.setAttribute('fill', '#fff')
    textElement.setAttribute('font-size', '10px')
    textElement.setAttribute('font-family', 'Saira')
    textElement.setAttribute('font-weight', '500')

    // --- 处理多行文本 ---
    // 将事件名称按空格分割成单词，以便分行显示
    const words = eventName.split(' ')
    const numLines = words.length
    const lineHeightEm = 1.2 // 行高 (相对于字体大小)

    if (numLines > 0) {
      words.forEach((word, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspan.setAttribute('x', String(textCenterX)) // 每行都水平居中
        tspan.textContent = word

        if (index === 0) {
          // 对于第一行，计算一个向上的偏移量，使整个文本块垂直居中
          const firstLineDy = -((numLines - 1) / 2) * lineHeightEm
          tspan.setAttribute('dy', `${firstLineDy}em`)
        }
        else {
          // 对于后续行，相对于上一行向下移动一个行高
          tspan.setAttribute('dy', `${lineHeightEm}em`)
        }
        textElement.appendChild(tspan)
      })
    }
    group.appendChild(textElement)
  }
}

// --- Vue 生命周期钩子和侦听器 ---

// onMounted: 当组件挂载到 DOM 后，立即执行一次绘图。
onMounted(() => {
  plotNodesOnCircle()
})

// watch: 侦听所有可能影响视图的 props 和计算属性。
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
    // 当任何依赖项发生变化时，重新调用绘图函数以更新 SVG。
    plotNodesOnCircle()
  },
  {
    deep: true, // 深度侦听，对于 timestamps 和 nodeNames 这样的数组/对象是必需的。
    immediate: false, // 不在初始渲染时立即执行（因为 onMounted 已经处理了）。
  },
)
</script>

<template>
  <!-- 容器 div, 使用绝对定位将组件固定在父容器的底部中心 -->
  <div class="absolute bottom-0 w-full flex justify-center overflow-hidden">
    <svg class="w-full" :width="effectiveSvgWidth" :height="effectiveSvgHeight">
      <g ref="contentGroupEl" class="fade-opacity" />
    </svg>
  </div>
</template>

<style lang="css" scoped>
.fade-opacity {
  width: 1920px;
  height: 200px;
  mask: linear-gradient(
    90deg,
    transparent 0%,
    /* 变化非常缓慢 */ rgba(0, 0, 0, 0.1) 10%,
    /* 快速变化 */ rgba(0, 0, 0, 0.55) 30%,
    /* 到达完全不透明 */ rgba(0, 0, 0, 1) 35%,
    /* 保持完全不透明 */ rgba(0, 0, 0, 1) 65%,
    /* 开始快速变化 */ rgba(0, 0, 0, 0.55) 70%,
    /* 变化再次减慢 */ rgba(0, 0, 0, 0.1) 90%,
    transparent 100%
  );
}
</style>
