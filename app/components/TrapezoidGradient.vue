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

// Generate a unique ID for the gradient for this component instance
// This helps avoid conflicts if you use multiple instances of this component on the same page.
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

  // Points for the standard (non-flipped) orientation
  // P1: (0,0) - Left top
  // P2_arc_start: (tw - r, 0) - Top right arc start
  // P2_arc_end: (tw, r) - Top right arc end
  // P3: (bw, h) - Bottom right
  // P4: (0, h) - Bottom left

  // If the shape is flipped, the origin for its points effectively shifts.
  // The drawing commands remain relative to a 0,0 origin for the path itself,
  // but the transform will place it correctly.

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
    // Scale by -1 in X, then translate by svgWidth to bring it back into view
    // This flips the shape around its local Y-axis if it were at X=0.
    // Since we want to flip it within the SVG canvas, we translate.
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

    <!--
      The path is drawn as if it's starting from 0,0.
      If flipped, the `transform` attribute handles the mirroring.
      The svgWidth for the path itself (bw) might be different from the props.svgWidth
      if the user wants padding around the trapezoid.
      Here, we assume the trapezoid's bottomWidth can define the needed width.
    -->
    <path :d="pathD" :fill="`url(#${gradientId})`" :transform="transform" />
  </svg>
</template>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
