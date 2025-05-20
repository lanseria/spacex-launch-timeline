<script setup lang="ts">
// components/TimelineSvg.vue
const props = defineProps<{
  timestamps: number[] // Float values in minutes
  nodeNames: string[]
  missionDuration: number // Total mission duration in float minutes
  svgWidth?: number
  svgHeight?: number
}>()

const svgEl = ref<SVGElement | null>(null)
const svgId = 'myTimelineSvg'
const svgWrapperId = 'svg_wrapper_timeline'

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

  const currentCircleRadius = circleRadius.value
  const currentCircleCenterX = circleCenterX.value
  const currentCircleCenterY = circleCenterY.value

  svg.innerHTML = ''

  const mainCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  mainCircle.setAttribute('cx', String(currentCircleCenterX))
  mainCircle.setAttribute('cy', String(currentCircleCenterY)) // Center is likely below the SVG view
  mainCircle.setAttribute('r', String(currentCircleRadius))
  mainCircle.setAttribute('stroke', '#444') // Dim color for debugging
  mainCircle.setAttribute('fill', 'none')
  svg.appendChild(mainCircle)

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  marker.setAttribute('stroke', '#ffffff')
  marker.setAttribute('stroke-width', '2')
  marker.setAttribute('x1', String(currentCircleCenterX)) // Centered horizontally
  marker.setAttribute('y1', String(0)) // Top of SVG
  marker.setAttribute('x2', String(currentCircleCenterX))
  marker.setAttribute('y2', String(10)) // Small line extending downwards
  svg.appendChild(marker)

  // Plotting nodes:
  // Nodes are plotted on the circumference of the main large circle.
  // Their positions are calculated relative to currentCircleCenterX and currentCircleCenterY.
  // Only nodes that fall within the visible arc segment will actually be seen.

  const n = props.timestamps.length
  // 'd_totalDuration' is the mission duration that corresponds to a full 360-degree sweep of the circle.
  const d_totalDuration = props.missionDuration <= 0 ? 1 : props.missionDuration

  for (let i = 0; i < n; i++) {
    const t_i = props.timestamps[i]
    const nodeNameText = props.nodeNames[i] || `Event ${i + 1}`

    // Angle calculation for nodes on the large circle:
    // 0 radians (or -PI/2) should be "straight up" from the circle's center.
    // Angle increases clockwise.
    const angle_rad_node = (t_i / d_totalDuration) * 2 * Math.PI - (Math.PI / 2)

    const x_i = currentCircleCenterX + currentCircleRadius * Math.cos(angle_rad_node)
    const y_i = currentCircleCenterY + currentCircleRadius * Math.sin(angle_rad_node)

    // Only draw elements if they are potentially visible within the SVG's height
    // This is a rough filter; more precise would be to check against the arc.
    if (y_i < -100 || y_i > effectiveSvgHeight.value + 100) { // Add some buffer
      // continue; // Skip drawing if way off-screen vertically
    }

    // Node circle
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    node.setAttribute('cx', String(x_i))
    node.setAttribute('cy', String(y_i))
    node.setAttribute('r', '5')
    node.setAttribute('stroke', '#ffffff')
    node.setAttribute('stroke-width', '1')
    node.setAttribute('fill', (y_i < 0 || y_i > effectiveSvgHeight.value) ? '#555' : '#000000') // Dim if outside primary view
    svg.appendChild(node)

    // Highlight (small dot) if node is "active" (near the top-center of the circle, effectively at the marker's angular position)
    // This means t_i is close to 0 or close to d_totalDuration (if it wraps around)
    const isNearMarker = Math.abs(t_i) < (0.02 * d_totalDuration) || Math.abs(t_i - d_totalDuration) < (0.02 * d_totalDuration)
    if (isNearMarker && y_i >= 0 && y_i <= effectiveSvgHeight.value) {
      const nameCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      nameCircle.setAttribute('cx', String(x_i))
      nameCircle.setAttribute('cy', String(y_i))
      nameCircle.setAttribute('r', '2')
      nameCircle.setAttribute('fill', '#ffffff')
      svg.appendChild(nameCircle)
    }

    // Text for node name
    const name = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    const textOffset = 20 // How far from the node circle the text appears

    // Text position relative to the node on the large circle's circumference
    const text_x = x_i + textOffset * Math.cos(angle_rad_node) // Simplistic offset for now
    const text_y = y_i + textOffset * Math.sin(angle_rad_node) // Needs better logic for readability

    // More sophisticated text positioning:
    // Calculate the angle of the text relative to the node's point, so it's oriented outwards
    const textAngleForPositioning = angle_rad_node
    const text_x_better = x_i + textOffset * Math.cos(textAngleForPositioning)
    const text_y_better = y_i + textOffset * Math.sin(textAngleForPositioning)

    name.setAttribute('x', String(text_x_better))
    name.setAttribute('y', String(text_y_better))

    // Rotate text to be readable - this angle is relative to horizontal
    const textRotationAngleDeg = (angle_rad_node + Math.PI / 2) * (180 / Math.PI)
    name.setAttribute('transform', `rotate(${textRotationAngleDeg}, ${text_x_better}, ${text_y_better})`)

    if (textRotationAngleDeg > 90 && textRotationAngleDeg < 270) {
      name.setAttribute('text-anchor', 'end')
      name.setAttribute('dx', '-3px')
    }
    else {
      name.setAttribute('text-anchor', 'start')
      name.setAttribute('dx', '3px')
    }
    name.setAttribute('dy', '0.35em') // Vertical alignment
    name.setAttribute('fill', (y_i < 0 || y_i > effectiveSvgHeight.value) ? '#777' : '#ffffff')
    name.setAttribute('font-size', '10')
    name.textContent = nodeNameText
    svg.appendChild(name)
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
    <div :id="svgWrapperId" data-angle="0">
      <!-- eslint-disable-next-line vue/html-self-closing -->
      <svg :id="svgId" ref="svgEl" :width="svgWidth" :height="svgHeight"></svg>
    </div>
  </div>
</template>
