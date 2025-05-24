<script setup lang="ts">
import { debounce } from 'es-toolkit'

const props = defineProps({
  width: {
    type: String,
    default: '1920',
  },
  height: {
    type: String,
    default: '1080',
  },
})
const { backgroundImageUrl } = useSpaceTimeline()

const dynamicBackgroundStyle = computed(() => {
  if (backgroundImageUrl.value && backgroundImageUrl.value.trim() !== '') {
    return {
      'background-image': `url('${backgroundImageUrl.value}')`,
      'background-size': 'cover',
      'background-position': 'center center',
      'background-repeat': 'no-repeat',
      'background-attachment': 'fixed',
    }
  }
  // 如果没有有效的 URL，可以返回一个空对象或默认样式
  return {
    'background-color': '#0f172a', // 例如 slate-900
  }
})

const style = reactive({
  width: `${props.width}px`,
  height: `${props.height}px`,
  transform: 'scale(1) translate(-50%, -50%)',
})

// 获取放大缩小比例
function getScale() {
  const w = window.innerWidth / +props.width
  const h = window.innerHeight / +props.height
  return w < h ? w : h
}
// 设置比例
function setScale() {
  style.transform = `scale(${getScale()}) translate(-50%, -50%)`
}
onMounted(() => {
  setScale()
  window.onresize = debounce(setScale, 200)
})
</script>

<template>
  <div
    class="screen-adapter" :style="{
      ...style,
      ...dynamicBackgroundStyle,
    }"
  >
    <slot />
  </div>
</template>

<style lang="css" scoped>
.screen-adapter {
  transform-origin: 0 0;
  position: absolute;
  left: 50%;
  top: 50%;
  transition: 0.3s;
}
</style>
