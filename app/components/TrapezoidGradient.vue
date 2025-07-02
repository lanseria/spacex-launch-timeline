<script lang="ts" setup>
import { computed } from 'vue'

// 只保留了颜色和水平翻转的 props
const props = withDefaults(defineProps<{
  color?: string
  horizontalFlip?: boolean
}>(), {
  color: 'black',
  horizontalFlip: false,
})

// 固定的 SVG 尺寸
const svgWidth = 545
const svgHeight = 142

// 确保组件多次使用时ID不冲突
const gradientId = computed(() => `trapezoidVerticalGradient-${Math.random().toString(36).substring(2, 9)}`)

// 使用您提供的示例中的固定路径数据
// M344.24 0              -> 移动到 (344.24, 0)
// L0 0                   -> 画线到左上角 (0, 0)
// L0 142                 -> 画线到左下角 (0, 142)
// L545 142               -> 画线到右下角 (545, 142)
// L395.18 18.31          -> 画线到曲线的起始点
// C380.845 6.4755 ...    -> 使用三次贝塞尔曲线创建平滑的弧度，连接回 (344.24, 0)
// Z                      -> 闭合路径
const pathD = 'M344.24 0L0 0L0 142L545 142L395.18 18.31C380.845 6.4755 362.829 0 344.24 0Z'

// 水平翻转的 transform 计算保持不变
const transform = computed(() => {
  if (props.horizontalFlip) {
    // 使用固定的宽度进行翻转
    return `translate(${svgWidth}, 0) scale(-1, 1)`
  }
  return ''
})
</script>

<template>
  <!-- 使用固定的宽度和高度 -->
  <svg :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 545 142" fill="none">
    <defs>
      <!--
        学习了您提供的示例 SVG：
        - gradientUnits="userSpaceOnUse": 渐变的坐标(x1, y1, x2, y2)是基于SVG画布的绝对坐标，而不是图形的边界框百分比。
        - x1, x2: 设为相同的值（如 SVG 宽度的一半）来创建垂直渐变。
        - y1="0", y2="105.5": 渐变从顶部 (y=0) 开始，到 y=105.5 处结束，而不是填满整个 142 的高度。
      -->
      <linearGradient
        :id="gradientId"
        :x1="svgWidth / 2"
        y1="0"
        :x2="svgWidth / 2"
        y2="105.5"
        gradientUnits="userSpaceOnUse"
      >
        <!-- 从顶部开始：指定颜色，40% 不透明度 -->
        <stop offset="0" :style="{ stopColor: color, stopOpacity: 0.4 }" />
        <!-- 到底部结束：指定颜色，完全透明 -->
        <stop offset="1" :style="{ stopColor: color, stopOpacity: 0 }" />
      </linearGradient>
    </defs>
    <!-- 使用新的 pathD 和翻转逻辑 -->
    <path :d="pathD" :fill="`url(#${gradientId})`" :transform="transform" />
  </svg>
</template>
