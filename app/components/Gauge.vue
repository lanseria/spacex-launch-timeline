<script setup lang="ts">
// How much larger the background circle radius is than the gauge radius

const props = defineProps({
  label: { // label of the gauge
    type: String,
    required: true,
  },
  value: { // Current value of the gauge
    type: Number,
    default: 75,
  },
  unit: { // Current value of the gauge
    type: String,
    required: true,
  },
  maxValue: { // Maximum value the gauge represents
    type: Number,
    default: 100,
  },
})
// --- Configuration Constants ---
const GAUGE_RADIUS = 70
const STROKE_WIDTH = 4
// Effective visual starting angle (0 is top, 90 is right, 180 is bottom, 225 is bottom-left)
// Original default was 135, with a +120 offset in describeArc, making it 255.
const GAUGE_VISUAL_START_ANGLE = 255 // "7-8 o'clock" position
const TOTAL_GAUGE_SWEEP_ANGLE = 210
const CRITICAL_SWEEP_ANGLE = 180 // Angle (within the sweep) where the color changes

const BACKGROUND_CIRCLE_PADDING = 5// Internal reactive state for the progress value
const progressValue = ref(props.value)
watch(() => props.value, (newValue) => {
  progressValue.value = Math.max(0, Math.min(props.maxValue, newValue))
})

// --- SVG Dimensions ---
// The background circle is the outermost element. Its radius determines the overall size.
const backgroundCircleRadius = computed(() => GAUGE_RADIUS + BACKGROUND_CIRCLE_PADDING)

// ViewBox needs to encompass the background circle.
// Stroke width of arcs is centered on GAUGE_RADIUS, so it extends GAUGE_RADIUS + STROKE_WIDTH / 2.
// We ensure the viewBox is large enough for either the background circle or the gauge arc.
const effectiveOuterRadius = computed(() => Math.max(backgroundCircleRadius.value, GAUGE_RADIUS + STROKE_WIDTH / 2))

const viewBoxSize = computed(() => effectiveOuterRadius.value * 2)
const cx = computed(() => effectiveOuterRadius.value) // Center X of the viewBox
const cy = computed(() => effectiveOuterRadius.value) // Center Y of the viewBox
const svgSize = computed(() => viewBoxSize.value)

// Helper function to convert polar coordinates to Cartesian
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0 // Subtract 90 to make 0 degrees point up
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  }
}

// Helper function to describe an SVG arc path
function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  // Sanitize angles to avoid >360 issues with single arc paths
  if (Math.abs(endAngleDeg - startAngleDeg) >= 360) {
    endAngleDeg = startAngleDeg + 359.99 // Almost full circle
  }
  // Avoid drawing if no sweep
  if (Math.abs(endAngleDeg - startAngleDeg) < 0.01)
    return ''

  const startPoint = polarToCartesian(x, y, radius, startAngleDeg)
  const endPoint = polarToCartesian(x, y, radius, endAngleDeg)

  const arcSweepDegrees = endAngleDeg - startAngleDeg
  const largeArcFlag = Math.abs(arcSweepDegrees) <= 180 ? '0' : '1'
  const sweepFlag = arcSweepDegrees > 0 ? '1' : '0' // '1' for positive angle direction (clockwise)

  const d = [
    'M',
    startPoint.x,
    startPoint.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    sweepFlag,
    endPoint.x,
    endPoint.y,
  ].join(' ')

  return d
}

// --- Background Arcs ---
const backgroundArcGrayPath = computed(() => {
  const start = GAUGE_VISUAL_START_ANGLE
  const end = GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE
  return describeArc(cx.value, cy.value, GAUGE_RADIUS, start, end)
})

const backgroundArcDarkRedPath = computed(() => {
  const start = GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE
  const end = GAUGE_VISUAL_START_ANGLE + TOTAL_GAUGE_SWEEP_ANGLE
  return describeArc(cx.value, cy.value, GAUGE_RADIUS, start, end)
})

// --- Foreground (Progress) Arcs ---
const currentProgressRatio = computed(() => {
  const val = Math.max(0, Math.min(props.maxValue, progressValue.value))
  return props.maxValue === 0 ? 0 : val / props.maxValue // Avoid division by zero
})

const currentProgressAngle = computed(() => currentProgressRatio.value * TOTAL_GAUGE_SWEEP_ANGLE)

const whitePartSweep = computed(() => {
  return Math.min(currentProgressAngle.value, CRITICAL_SWEEP_ANGLE)
})

const redPartSweep = computed(() => {
  if (currentProgressAngle.value <= CRITICAL_SWEEP_ANGLE)
    return 0
  return currentProgressAngle.value - CRITICAL_SWEEP_ANGLE
})

const progressArcWhitePath = computed(() => {
  if (whitePartSweep.value <= 0.01)
    return ''
  const start = GAUGE_VISUAL_START_ANGLE
  const end = GAUGE_VISUAL_START_ANGLE + whitePartSweep.value
  return describeArc(cx.value, cy.value, GAUGE_RADIUS, start, end)
})

const progressArcRedPath = computed(() => {
  if (redPartSweep.value <= 0.01)
    return ''
  const start = GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE
  const end = GAUGE_VISUAL_START_ANGLE + CRITICAL_SWEEP_ANGLE + redPartSweep.value
  return describeArc(cx.value, cy.value, GAUGE_RADIUS, start, end)
})
</script>

<template>
  <div class="flex flex-col items-center">
    <svg :width="svgSize" :height="svgSize" :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`">
      <!-- Background Circle -->
      <circle
        :cx="cx"
        :cy="cy"
        :r="backgroundCircleRadius"
        fill="rgba(0,0,0,0.2)"
        stroke="none"
      />

      <!-- Background Arc - Gray part -->
      <path
        :d="backgroundArcGrayPath"
        class="stroke-gray-300 dark:stroke-gray-600"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Background Arc - Dark Red part -->
      <path
        :d="backgroundArcDarkRedPath"
        class="stroke-red-800 dark:stroke-red-900"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Foreground Progress Arc - White part -->
      <path
        v-if="progressValue > 0 && whitePartSweep > 0.01"
        :d="progressArcWhitePath"
        class="stroke-white dark:stroke-gray-100"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.3))` }"
      />

      <!-- Foreground Progress Arc - Red part -->
      <path
        v-if="redPartSweep > 0.01"
        :d="progressArcRedPath"
        class="stroke-red-500"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 3px rgb(239 68 68 / 0.7))` }"
      />

      <!-- Text in the center -->
      <text
        :x="cx"
        :y="cy"
        text-anchor="middle"
        dominant-baseline="central"
        class="font-saira select-none fill-current"
      >
        <!-- 标签 (顶部) -->
        <tspan
          :x="cx"
          dy="-2.5em"
          class="text-12px text-gray-300"
        >
          {{ props.label }}
        </tspan>

        <!-- 数值 (居中) -->
        <tspan
          :x="cx"
          :y="cy"
          class="countdown text-42px text-white"
        >
          {{ Math.round(progressValue) }}
        </tspan>

        <!-- 单位 (底部) -->
        <tspan
          :x="cx"
          :y="cy"
          dy="2.5em"
          class="text-12px text-gray-300"
        >
          {{ props.unit }}
        </tspan>
      </text>
    </svg>
  </div>
</template>

<style lang="css" scoped>
/* 样式保持不变 */
.countdown {
  font-variant-numeric: tabular-nums;
}
</style>
