<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  svgWidth?: number
  svgHeight?: number
  topWidth?: number
  bottomWidth?: number
  radius?: number
  color?: string
  horizontalFlip?: boolean
}>(), {
  svgWidth: 600,
  svgHeight: 180,
  topWidth: 370,
  bottomWidth: 550,
  radius: 0,
  color: 'black',
  horizontalFlip: false,
})

const gradientId = computed(() => `trapezoidVerticalGradient-${Math.random().toString(36).substring(2, 9)}`)

// Calculate the effective radius, ensuring it's not too large for the dimensions
const effectiveRadius = computed(() => {
  return Math.min(props.radius, props.topWidth / 2, props.svgHeight / 2)
})

const pathD = computed(() => {
  const r = effectiveRadius.value
  const h = props.svgHeight
  const tw = props.topWidth // Top width of the trapezoid shape itself
  const bw = props.bottomWidth // Bottom width of the trapezoid shape itself

  // Path for the non-flipped version (rounded top-right)
  let d = `M 0 0` // Move to top-left
  d += ` L ${tw - r} 0` // Line to top-right arc start
  d += ` A ${r} ${r} 0 0 1 ${tw} ${r}` // Arc to top-right arc end
  d += ` L ${bw} ${h}` // Line to bottom-right
  d += ` L 0 ${h}` // Line to bottom-left
  d += ` Z` // Close path

  return d
})

const transform = computed(() => {
  if (props.horizontalFlip) {
    return `translate(${props.svgWidth}, 0) scale(-1, 1)`
  }
  return ''
})
</script>

<template>
  <svg :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="0%" y2="100%">
        <!-- From top: specified color, 70% opacity -->
        <stop offset="0%" :style="{ stopColor: color, stopOpacity: 0.6 }" />
        <stop offset="30%" :style="{ stopColor: color, stopOpacity: 0.5 }" />
        <!-- To middle: specified color, fully transparent -->
        <stop offset="70%" :style="{ stopColor: color, stopOpacity: 0.2 }" />
        <!-- To bottom: specified color, fully transparent -->
        <stop offset="100%" :style="{ stopColor: color, stopOpacity: 0 }" />
      </linearGradient>
    </defs>
    <path :d="pathD" :fill="`url(#${gradientId})`" :transform="transform" />
  </svg>
</template>
