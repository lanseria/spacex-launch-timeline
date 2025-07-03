<script setup lang="ts">
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    default: 75,
  },
  unit: {
    type: String,
    required: true,
  },
  maxValue: {
    type: Number,
    default: 100,
  },
  fractionDigits: {
    type: Number,
    default: 0,
  },
})

// --- Configuration Constants ---
const GAUGE_RADIUS = 70
const STROKE_WIDTH = 4
const GAUGE_VISUAL_START_ANGLE = 240
const TOTAL_GAUGE_SWEEP_ANGLE = 240
const CRITICAL_SWEEP_ANGLE = 240

const BACKGROUND_CIRCLE_PADDING = 8
const TICK_MARK_LENGTH = 6 // 新增：刻度线长度
const TICK_STROKE_WIDTH = 2.5 // 新增：刻度线粗细 (可以与 STROKE_WIDTH 不同，使其更细)

const progressValue = ref(props.value)
watch(() => props.value, (newValue) => {
  progressValue.value = Math.max(0, Math.min(props.maxValue, newValue))
})

const backgroundCircleRadius = computed(() => GAUGE_RADIUS + BACKGROUND_CIRCLE_PADDING)
const effectiveOuterRadius = computed(() => Math.max(backgroundCircleRadius.value, GAUGE_RADIUS + STROKE_WIDTH / 2))
const viewBoxSize = computed(() => effectiveOuterRadius.value * 2)
const cx = computed(() => effectiveOuterRadius.value)
const cy = computed(() => effectiveOuterRadius.value)
const svgSize = computed(() => viewBoxSize.value)

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Number.parseFloat('3.141592653589793') / 180.0 // Math.PI
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  }
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  if (Math.abs(endAngleDeg - startAngleDeg) >= 360) {
    endAngleDeg = startAngleDeg + 359.99
  }
  if (Math.abs(endAngleDeg - startAngleDeg) < 0.01)
    return ''

  const startPoint = polarToCartesian(x, y, radius, startAngleDeg)
  const endPoint = polarToCartesian(x, y, radius, endAngleDeg)
  const arcSweepDegrees = endAngleDeg - startAngleDeg
  const largeArcFlag = Math.abs(arcSweepDegrees) <= 180 ? '0' : '1'
  const sweepFlag = arcSweepDegrees > 0 ? '1' : '0'

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

const currentProgressRatio = computed(() => {
  const val = Math.max(0, Math.min(props.maxValue, progressValue.value))
  return props.maxValue === 0 ? 0 : val / props.maxValue
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

// --- 刻度线计算 ---
const gaugeEndAngle = computed(() => GAUGE_VISUAL_START_ANGLE + TOTAL_GAUGE_SWEEP_ANGLE)

// 起始刻度线坐标
const startTickOuterPoint = computed(() => polarToCartesian(cx.value - STROKE_WIDTH / 2, cy.value, GAUGE_RADIUS, GAUGE_VISUAL_START_ANGLE - 1.6))
const startTickInnerPoint = computed(() => polarToCartesian(cx.value, cy.value, GAUGE_RADIUS - TICK_MARK_LENGTH, GAUGE_VISUAL_START_ANGLE - 1.6))

// 结束刻度线坐标
const endTickOuterPoint = computed(() => polarToCartesian(cx.value + STROKE_WIDTH / 2, cy.value, GAUGE_RADIUS, gaugeEndAngle.value + 1.6))
const endTickInnerPoint = computed(() => polarToCartesian(cx.value, cy.value, GAUGE_RADIUS - TICK_MARK_LENGTH, gaugeEndAngle.value + 1.6))

// 前景起始刻度线是否可见 (有进度时)
const showProgressStartTick = computed(() => progressValue.value > 0 && whitePartSweep.value > 0.01)

// 前景结束刻度线是否可见 (满进度时)
const showProgressEndTick = computed(() => {
  // 当进度值达到或超过最大值时，并且最大值不为0
  if (props.maxValue === 0)
    return false // 避免 maxValue 为0时也显示
  return progressValue.value >= props.maxValue
})
</script>

<template>
  <div class="flex flex-col items-center">
    <svg :width="svgSize" :height="svgSize" :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`">
      <defs>
        <linearGradient id="backgroundCircleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0.5); stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(0,0,0,0); stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Background Circle -->
      <circle
        :cx="cx"
        :cy="cy"
        :r="backgroundCircleRadius"
        fill="url(#backgroundCircleGradient)"
        stroke="none"
      />

      <!-- Background Arc - Gray part -->
      <path
        :d="backgroundArcGrayPath"
        class="stroke-white/30"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Background Arc - Dark Red part -->
      <path
        :d="backgroundArcDarkRedPath"
        class="stroke-red-900"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Background Start Tick -->
      <line
        :x1="startTickInnerPoint.x"
        :y1="startTickInnerPoint.y"
        :x2="startTickOuterPoint.x"
        :y2="startTickOuterPoint.y"
        class="stroke-white/30"
        :stroke-width="TICK_STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Background End Tick -->
      <line
        :x1="endTickInnerPoint.x"
        :y1="endTickInnerPoint.y"
        :x2="endTickOuterPoint.x"
        :y2="endTickOuterPoint.y"
        class="stroke-white/30"
        :stroke-width="TICK_STROKE_WIDTH"
        stroke-linecap="butt"
      />

      <!-- Foreground Progress Arc - White part -->
      <path
        v-if="showProgressStartTick"
        :d="progressArcWhitePath"
        class="stroke-white/90"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.3))` }"
      />

      <!-- Foreground Progress Arc - Red part -->
      <path
        v-if="redPartSweep > 0.01"
        :d="progressArcRedPath"
        class="stroke-white/90"
        fill="none"
        :stroke-width="STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.3))` }"
      />

      <!-- Foreground Start Tick (Progress) -->
      <line
        v-if="showProgressStartTick"
        :x1="startTickInnerPoint.x"
        :y1="startTickInnerPoint.y"
        :x2="startTickOuterPoint.x"
        :y2="startTickOuterPoint.y"
        class="stroke-white/90"
        :stroke-width="TICK_STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.3))` }"
      />

      <!-- Foreground End Tick (Progress) -->
      <line
        v-if="showProgressEndTick"
        :x1="endTickInnerPoint.x"
        :y1="endTickInnerPoint.y"
        :x2="endTickOuterPoint.x"
        :y2="endTickOuterPoint.y"
        class="stroke-white/90"
        :stroke-width="TICK_STROKE_WIDTH"
        stroke-linecap="butt"
        :style="{ filter: `drop-shadow(0 0 2px rgba(0,0,0,0.3))` }"
      />

      <!-- Text in the center -->
      <text
        :x="cx"
        :y="cy"
        text-anchor="middle"
        dominant-baseline="central"
        class="select-none fill-current font-saira"
      >
        <tspan
          :x="cx"
          dy="-2.0em"
          class="text-14px text-white/50 font-500"
        >
          {{ props.label }}
        </tspan>
        <tspan
          :x="cx"
          :y="cy"
          class="text-38px text-white tabular-nums"
        >
          {{ progressValue.toFixed(fractionDigits) }}
        </tspan>
        <tspan
          :x="cx"
          :y="cy"
          dy="2.0em"
          class="text-14px text-white/50 font-500"
        >
          {{ props.unit }}
        </tspan>
      </text>
    </svg>
  </div>
</template>
