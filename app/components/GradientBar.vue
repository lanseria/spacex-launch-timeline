<script lang="ts" setup>
const props = withDefaults(defineProps<{
  width?: number
  height?: number
  color?: string
}>(), {
  width: 1920,
  height: 94,
  color: 'black',
})

// 为渐变创建唯一的 ID，防止在同一页面上多次使用组件时发生冲突
const gradientId = useId()

// 计算 viewBox 属性，确保 SVG 能够正确缩放
const viewBox = computed(() => `0 0 ${props.width} ${props.height}`)

// 渐变的 x 坐标位于矩形的中心，以创建纯粹的垂直渐变
const gradientX = computed(() => props.width / 2)
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <!--
        学习了您提供的 SVG：
        - y1="height", y2="0": 渐变从底部 (y=94) 开始，到顶部 (y=0) 结束。
        - gradientUnits="userSpaceOnUse": 坐标是相对于整个 SVG 画布的绝对坐标。
      -->
      <linearGradient
        :id="gradientId"
        :x1="gradientX"
        :y1="height"
        :x2="gradientX"
        :y2="0"
        gradientUnits="userSpaceOnUse"
      >
        <!-- 渐变的起点 (offset="0"，即底部): 指定颜色，20% 不透明度 -->
        <stop offset="0" :style="{ stopColor: color, stopOpacity: 0.4 }" />
        <!-- 渐变的终点 (offset="1"，即顶部): 指定颜色，完全透明 -->
        <stop offset="1" :style="{ stopColor: color, stopOpacity: 0 }" />
      </linearGradient>
    </defs>
    <!-- 一个填满整个 SVG 区域的矩形 -->
    <rect
      x="0"
      y="0"
      :width="width"
      :height="height"
      :fill="`url(#${gradientId})`"
    />
  </svg>
</template>
