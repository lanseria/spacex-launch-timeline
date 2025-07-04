import type { ToRefs } from 'vue'

// 定义 Props 类型以供 composable 使用
interface GeometryProps {
  svgWidth?: number
  svgHeight?: number
}

export function useTimelineGeometryV1(props: ToRefs<GeometryProps>) {
  const effectiveSvgWidth = computed(() => props.svgWidth?.value || 1920)
  const effectiveSvgHeight = computed(() => props.svgHeight?.value || 200)

  const circleRadius = computed(() => effectiveSvgWidth.value / 2)
  const circleCenterX = computed(() => effectiveSvgWidth.value / 2)

  const circleCenterY = computed(() => {
    const exposedArcAngleDeg = 64
    const exposedArcAngleRad = exposedArcAngleDeg * (Math.PI / 180)
    const distCenterToChord = circleRadius.value * Math.cos(exposedArcAngleRad / 2)
    return effectiveSvgHeight.value + distCenterToChord
  })

  return {
    effectiveSvgWidth,
    effectiveSvgHeight,
    circleRadius,
    circleCenterX,
    circleCenterY,
  }
}
