<script setup lang="ts">
// components/TimelineSvg.vue
const props = defineProps<{
  timestamps: number[] // 事件的绝对时间戳 (秒), 相对于时间轴0点
  nodeNames: string[]
  missionDuration: number // SVG 圆周代表的总时间跨度 (秒)
  currentTime?: number // 当前时间在时间轴上的位置 (秒), 可选
  svgWidth?: number
  svgHeight?: number
}>()

const svgEl = ref<SVGElement | null>(null)

const effectiveSvgWidth = computed(() => props.svgWidth || 1200)
const effectiveSvgHeight = computed(() => props.svgHeight || 600) // Default height

// --- Configuration for the main circle ---
const exposedArcAngleDeg = 67.52 // The desired visible arc at the top of the SVG in degrees
const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)

// Main circle's actual radius
// Let's assume the diameter of the full circle is related to the SVG width
const circleRadius = computed(() => effectiveSvgWidth.value / 2)

const distCenterToChord = computed(() => {
  return circleRadius.value * Math.cos(exposedArcAngleRad / 2)
})

const circleCenterY = computed(() => props.svgHeight! + distCenterToChord.value)
const circleCenterX = computed(() => effectiveSvgWidth.value / 2)

function plotNodesOnCircle() {
  const svg = svgEl.value
  if (!svg)
    return

  const currentCircleRadius = circleRadius.value // Radius of the large background circle
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value

  svg.innerHTML = '' // Clear previous drawings

  // Main large circle (for visual reference)
  const mainCircleElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  mainCircleElement.setAttribute('cx', String(currentCircleCenterX))
  mainCircleElement.setAttribute('cy', String(currentCircleCenterY))
  mainCircleElement.setAttribute('r', String(currentCircleRadius))
  mainCircleElement.setAttribute('stroke', '#444')
  mainCircleElement.setAttribute('stroke-dasharray', '5,5')
  mainCircleElement.setAttribute('fill', 'none')
  svg.appendChild(mainCircleElement)

  // Marker line at the top of SVG viewport
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  // ... (marker setup as before)
  marker.setAttribute('stroke', '#ffffff')
  marker.setAttribute('stroke-width', '2')
  marker.setAttribute('x1', String(currentCircleCenterX))
  marker.setAttribute('y1', String(0))
  marker.setAttribute('x2', String(currentCircleCenterX))
  marker.setAttribute('y2', String(10))
  svg.appendChild(marker)

  const n = props.timestamps.length
  const d_totalDuration = props.missionDuration <= 0 ? 1 : props.missionDuration

  // Constants for node elements
  const nodeCircleRadius = 5 // Radius of the small "Node circle"
  const baseTextOffsetFromNodeEdge = 16 // Desired total distance from node edge to text center
  const lineToTextGap = 10 // Gap between end of line and start of text bounding box (approx)

  for (let i = 0; i < n; i++) {
    const t_i = props.timestamps[i]!
    const nodeNameText = props.nodeNames[i] || `Event ${i + 1}`
    const isOutside = i % 2 === 0 // True for outside, false for inside

    // Angle for the node on the large circle (same for node, line, text direction)
    const angle_rad_node = (t_i / d_totalDuration) * 2 * Math.PI - (Math.PI / 2) // 0 is top, clockwise

    // Center of the "Node circle" (the small dot)
    const node_dot_center_x = currentCircleCenterX + currentCircleRadius * Math.cos(angle_rad_node)
    const node_dot_center_y = currentCircleCenterY + currentCircleRadius * Math.sin(angle_rad_node)

    // Draw the "Node circle"
    const nodeDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    nodeDot.setAttribute('cx', String(node_dot_center_x))
    nodeDot.setAttribute('cy', String(node_dot_center_y))
    nodeDot.setAttribute('r', String(nodeCircleRadius))
    nodeDot.setAttribute('stroke', '#ffffff')
    nodeDot.setAttribute('stroke-width', '1')
    nodeDot.setAttribute('fill', (node_dot_center_y < 0 || node_dot_center_y > effectiveSvgHeight.value) ? '#555' : '#000000')
    svg.appendChild(nodeDot)

    // Highlight if near marker (as before)
    const isNearMarker = Math.abs(t_i) < (0.02 * d_totalDuration) || Math.abs(t_i - d_totalDuration) < (0.02 * d_totalDuration)
    if (isNearMarker && node_dot_center_y >= 0 && node_dot_center_y <= effectiveSvgHeight.value) {
      const activeDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      activeDot.setAttribute('cx', String(node_dot_center_x))
      activeDot.setAttribute('cy', String(node_dot_center_y))
      activeDot.setAttribute('r', '2') // Smaller inner dot
      activeDot.setAttribute('fill', '#ffffff')
      svg.appendChild(activeDot)
    }

    // Calculate positions for line and text
    const directionMultiplier = isOutside ? 1 : -1

    // Line starts at the edge of the "Node circle"
    const line_start_x = node_dot_center_x + directionMultiplier * nodeCircleRadius * Math.cos(angle_rad_node)
    const line_start_y = node_dot_center_y + directionMultiplier * nodeCircleRadius * Math.sin(angle_rad_node)

    // Text center position:
    // Total offset from "Node circle" center to text center.
    // Includes nodeCircleRadius, length of the line, and gap to text.
    const totalOffsetToTextCenter = directionMultiplier * (nodeCircleRadius + baseTextOffsetFromNodeEdge) // baseTextOffsetFromNodeEdge is from node edge

    const text_center_x = node_dot_center_x + totalOffsetToTextCenter * Math.cos(angle_rad_node)
    const text_center_y = node_dot_center_y + totalOffsetToTextCenter * Math.sin(angle_rad_node)

    // Line ends before the text center, leaving a gap
    // Effective length of the line itself (from node edge to near text)
    const lineLength = baseTextOffsetFromNodeEdge - lineToTextGap
    if (lineLength < 1)
      continue // Avoid drawing tiny or negative lines if offsets are too small

    const line_end_x = node_dot_center_x + directionMultiplier * (nodeCircleRadius + lineLength) * Math.cos(angle_rad_node)
    const line_end_y = node_dot_center_y + directionMultiplier * (nodeCircleRadius + lineLength) * Math.sin(angle_rad_node)

    // Draw connecting line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', String(line_start_x))
    line.setAttribute('y1', String(line_start_y))
    line.setAttribute('x2', String(line_end_x))
    line.setAttribute('y2', String(line_end_y))
    line.setAttribute('stroke', (node_dot_center_y < 0 || node_dot_center_y > effectiveSvgHeight.value) ? '#777' : '#ffffff')
    line.setAttribute('stroke-width', '1')
    svg.appendChild(line)

    // Draw Text for node name
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    nameText.setAttribute('x', String(text_center_x))
    nameText.setAttribute('y', String(text_center_y))

    // Rotate text to be perpendicular to the radius (tangential)
    const textRotationAngleDeg = (angle_rad_node + Math.PI / 2) * (180 / Math.PI)
    nameText.setAttribute('transform', `rotate(${textRotationAngleDeg}, ${text_center_x}, ${text_center_y})`)

    nameText.setAttribute('text-anchor', 'middle')
    nameText.setAttribute('dy', '0.35em') // Approximate vertical centering
    nameText.setAttribute('fill', (node_dot_center_y < 0 || node_dot_center_y > effectiveSvgHeight.value) ? '#777' : '#ffffff')
    nameText.setAttribute('font-size', '10')
    nameText.textContent = nodeNameText
    svg.appendChild(nameText)
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
    effectiveSvgWidth.value,
    effectiveSvgHeight.value,
  ],
  () => {
    plotNodesOnCircle()
  },
  { deep: true },
)
</script>

<template>
  <div class="canvas_wrapper">
    <div data-angle="0" class="flex justify-center">
      <!-- eslint-disable-next-line vue/html-self-closing -->
      <svg ref="svgEl" :width="svgWidth" :height="svgHeight"></svg>
    </div>
  </div>
</template>
