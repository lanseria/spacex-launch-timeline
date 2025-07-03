<!-- app/components/modal/DisplayInfoModal.vue -->
<script setup lang="ts">
import type { DisplayInfo } from '~/types'

const props = defineProps<{
  show: boolean
  displayInfo: DisplayInfo
}>()

const emit = defineEmits(['close', 'update:displayInfo'])

const displayInfoWritable = computed({
  get: () => props.displayInfo,
  set: val => emit('update:displayInfo', val),
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
      <div class="exclude-from-screenshot m-4 max-w-md w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
        <h2 class="mb-4 text-xl font-semibold">
          配置右下角显示文本
        </h2>
        <div class="space-y-3">
          <div>
            <label for="displayInfoTitleInput" class="mb-1 block text-sm text-gray-300 font-medium">标题</label>
            <input id="displayInfoTitleInput" v-model="displayInfoWritable.title" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本标题">
          </div>
          <div>
            <label for="displayInfoLine1Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 1</label>
            <input id="displayInfoLine1Input" v-model="displayInfoWritable.line1" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 1">
          </div>
          <div>
            <label for="displayInfoLine2Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 2</label>
            <input id="displayInfoLine2Input" v-model="displayInfoWritable.line2" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 2">
          </div>
          <div>
            <label for="displayInfoLine3Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 3</label>
            <input id="displayInfoLine3Input" v-model="displayInfoWritable.line3" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 3">
          </div>
        </div>
        <button type="button" class="btn-action mt-6 w-full bg-gray-600 hover:bg-gray-700" @click="emit('close')">
          关闭
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.input-field {
  --at-apply: 'block rounded-md border border-gray-600 px-3 py-2 shadow-sm sm:text-sm bg-gray-800 text-white focus:border-indigo-400 focus:ring-offset-gray-900';
}

.btn-action {
  --at-apply: 'rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none';
}
</style>
