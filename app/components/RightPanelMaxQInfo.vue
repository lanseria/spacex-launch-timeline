<script setup lang="ts">
const {
  maxQTitle,
  shouldShowDynamicText,
  currentDescriptions, // 使用这个计算属性会更简洁
} = useSpaceTimeline()
</script>

<template>
  <!-- 根据 shouldShowDynamicText 控制整个区域的显示 -->
  <div
    v-if="shouldShowDynamicText && (maxQTitle || currentDescriptions.length > 0)"
    class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira"
  >
    <div v-if="maxQTitle" class="text-30px font-600">
      {{ maxQTitle }}
    </div>
    <div v-for="(line, index) in currentDescriptions.slice(0, 3)" :key="index">
      {{ line }}
    </div>
  </div>
</template>
