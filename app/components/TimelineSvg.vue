// components/TimelineSvg.vue
<script setup lang="ts">
const props = defineProps<{
  timestamps: number[] // Float values in minutes
  nodeNames: string[]
  missionDuration: number // Total mission duration in float minutes
  svgWidth?: number
  svgHeight?: number
}>()

const svgEl = ref<SVGElement | null>(null)
const svgId = 'myTimelineSvg' // Dynamic ID if multiple instances
const svgWrapperId = 'svg_wrapper_timeline'

const effectiveSvgWidth = computed(() => props.svgWidth || 1200)
const effectiveSvgHeight = computed(() => props.svgHeight || 1200)

function plotNodesOnCircle() {
  const svg = svgEl.value
  if (!svg)
    return

  const n = props.timestamps.length
  const d = props.missionDuration <= 0 ? 1 : props.missionDuration // Avoid division by zero, use 1 as a fallback total duration if 0
  const r = Math.min(effectiveSvgWidth.value, effectiveSvgHeight.value) / 2 - 50 // Radius, with some padding
  const width = effectiveSvgWidth.value
  const height = effectiveSvgHeight.value

  svg.innerHTML = '' // Clear previous drawings

  const centerX = width / 2
  const centerY = height / 2

  // Create main circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', String(centerX))
  circle.setAttribute('cy', String(centerY))
  circle.setAttribute('r', String(r))
  circle.setAttribute('stroke', '#ffffff')
  circle.setAttribute('fill', 'none') // Typically unfilled
  svg.appendChild(circle)

  // Marker line (top of the circle)
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  marker.setAttribute('stroke', '#ffffff')
  marker.setAttribute('stroke-width', '2') // Make it a bit more visible
  // The marker should be at the "zero" point of the angle calculation.
  // Original angle math: 2 * Math.PI * t_i / d + Math.PI / 2 makes 0 degrees (top) the start.
  // So, x1,y1 to x2,y2 for a vertical line at the top.
  marker.setAttribute('x1', String(centerX))
  marker.setAttribute('y1', String(centerY - r - 5)) // Line starts above circle
  marker.setAttribute('x2', String(centerX))
  marker.setAttribute('y2', String(centerY - r + 5)) // Line ends slightly inside circle
  svg.appendChild(marker)

  for (let i = 0; i < n; i++) {
    const t_i = props.timestamps[i] // This is time from T-0 (countdown) or T+0 (countup)
    const nodeNameText = props.nodeNames[i] || `Event ${i + 1}`

    // Angle calculation: 0 degrees is top, clockwise.
    // t_i is minutes. d is total minutes for one revolution.
    // Original: angle_i = 2 * Math.PI * t_i / d + Math.PI / 2 (makes 0 at right, counter-clockwise if PI/2 is 0 rad)
    // Let's simplify: 0 at top, clockwise
    // An angle of 0 should be at (centerX, centerY - r)
    // Angle in radians: (t_i / d) * 2 * Math.PI. We subtract Math.PI / 2 to shift 0 to the top.
    let angle_rad = (t_i / d) * 2 * Math.PI - (Math.PI / 2)

    const x_i = centerX + r * Math.cos(angle_rad)
    const y_i = centerY + r * Math.sin(angle_rad)

    // Node circle
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    node.setAttribute('cx', String(x_i))
    node.setAttribute('cy', String(y_i))
    node.setAttribute('r', '5')
    node.setAttribute('stroke', '#ffffff')
    node.setAttribute('stroke-width', '1')
    node.setAttribute('fill', '#000000')
    svg.appendChild(node)

    // Highlight if node is near the marker (top)
    // This condition needs to be robust based on the marker's position and angle interpretation
    if (Math.abs(t_i) < (0.05 * d) || Math.abs(t_i - d) < (0.05 * d)) { // Example: if timestamp is very small or near full duration
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
    const textAngleDeg = (angle_rad * 180 / Math.PI) + 90 // Angle for text rotation (to keep upright)

    // Position text outside the main circle, adjust based on quadrant for readability
    let text_x = centerX + (r + textOffset) * Math.cos(angle_rad)
    let text_y = centerY + (r + textOffset) * Math.sin(angle_rad)

    name.setAttribute('x', String(text_x))
    name.setAttribute('y', String(text_y))

    // Rotate text to be readable
    // The transform-origin should be the text's own (x,y)
    name.setAttribute('transform', `rotate(${textAngleDeg}, ${text_x}, ${text_y})`)

    // Adjust text-anchor based on angle to prevent overlap with circle
    if (textAngleDeg > 90 && textAngleDeg < 270) { // Text on the left side
      name.setAttribute('text-anchor', 'end')
      // Nudge it a bit more if it was rotated
      name.setAttribute('dx', '-5px') // dx/dy on rotated text can be tricky
    }
    else { // Text on the right side
      name.setAttribute('text-anchor', 'start')
      name.setAttribute('dx', '5px')
    }
    name.setAttribute('dy', '0.35em') // Vertical alignment

    name.setAttribute('fill', '#ffffff')
    name.setAttribute('font-size', '10')
    name.textContent = nodeNameText
    svg.appendChild(name)

    // Connecting line from node to text (optional, can make it busy)
    // const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    // line.setAttribute('x1', String(x_i));
    // line.setAttribute('y1', String(y_i));
    // line.setAttribute('x2', String(text_x - ( (textAngleDeg > 90 && textAngleDeg < 270) ? -5:5) ) ); // approx end of text
    // line.setAttribute('y2', String(text_y));
    // line.setAttribute('stroke', '#ffffff');
    // line.setAttribute('stroke-width', '0.5');
    // svg.appendChild(line);
  }
}

onMounted(() => {
  plotNodesOnCircle()
})

watch(
  () => [props.timestamps, props.nodeNames, props.missionDuration, props.svgWidth, props.svgHeight],
  () => {
    plotNodesOnCircle()
  },
  { deep: true },
)

// No onBeforeUnmount needed as SVG elements are children and will be removed with component.
</script>

<template>
  <div class="canvas_wrapper">
    <div :id="svgWrapperId" data-angle="0">
      <!-- id was used in css, could be dynamic -->
      <svg :id="svgId" ref="svgEl" :width="svgWidth" :height="svgHeight" />
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles specific to this SVG component if needed */
.canvas_wrapper {
  /* Copied from global, ensure it's what you want here or rely on global */
  margin: 30px 0;
  padding: 50px 0; /* Padding provides space for SVG elements outside the circle */
  background: #111;
  color: #fff;
  box-shadow: 0 0 0 100vmax #111;
  clip-path: inset(0 -100vmax);
  min-height: 400px; /* Give it some default minimum height */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible; /* Allow SVG text to go outside defined bounds */
  position: relative;
}
#myTimelineSvg {
  /* ID used in script */
  /* transform: rotate(0deg); /* Initial rotation, if any. SVG drawing code handles node positions based on time. */
  /* SVG itself does not need to rotate if the nodes are plotted dynamically based on changing timestamps */
  /* transition: all 1ms; /* Not recommended for performance */
}
</style>
