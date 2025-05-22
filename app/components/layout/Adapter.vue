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
  console.warn('任你千变万化,我都不会影响性能')
}
onMounted(() => {
  setScale()
  window.onresize = debounce(setScale, 200)
})
</script>

<template>
  <div class="screen-adapter" :style="style">
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
