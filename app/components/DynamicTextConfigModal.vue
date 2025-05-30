// components/DynamicTextConfigModal.vue
<script setup lang="ts">
import type { DynamicTextEntry } from '~/composables/useSpaceTimeline'

const props = defineProps<{
  showModal: boolean
  textEntries: DynamicTextEntry[] | null
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'importData'): void
  (e: 'loadSampleData'): void
  (e: 'clearData'): void
}>()

const modalRef = useTemplateRef<HTMLElement>('dynamicTextModalInnerRef')
onClickOutside(modalRef, () => {
  if (props.showModal)
    emit('close')
})

function formatDescriptions(descriptions: string[]): string {
  if (!descriptions || descriptions.length === 0)
    return '无描述'
  if (descriptions.length === 1)
    return descriptions[0]!
  return descriptions.map(d => `- ${d}`).join('\n') // 用换行符连接，但在 HTML 中可能需要 <br> 或 <p>
}
</script>

<template>
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
      <div ref="modalRef" class="exclude-from-screenshot m-4 max-w-xl w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
        <h2 class="mb-4 text-xl font-semibold">
          动态文本配置
        </h2>
        <div v-if="!textEntries || textEntries.length === 0" class="space-y-4">
          <p class="text-gray-300">
            当前未导入动态文本数据。请导入 JSON 或加载示例。
          </p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" class="btn-action btn-primary w-full" @click="emit('importData')">
              导入本地 JSON
            </button>
            <button type="button" class="btn-action btn-teal w-full" @click="emit('loadSampleData')">
              加载示例数据
            </button>
          </div>
        </div>
        <div v-else class="space-y-4">
          <p class="text-gray-300">
            已导入的动态文本条目：
          </p>
          <div class="node-list-scrollbar max-h-[300px] overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50 p-3 space-y-3">
            <div v-for="(entry, index) in textEntries" :key="index" class="border-b border-gray-700 pb-2 last:border-b-0">
              <p class="font-semibold">
                {{ entry.title }}
              </p>
              <p class="text-sm text-gray-400">
                触发时间: T{{ entry.time >= 0 ? '+' : '' }}{{ entry.time }}s, 持续: {{ entry.duration }}s
              </p>
              <div class="mt-1 whitespace-pre-line text-sm text-gray-300">
                {{ formatDescriptions(entry.descriptions) }}
              </div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <button type="button" class="btn-action btn-danger w-full" @click="emit('clearData')">
              清空数据
            </button>
            <button type="button" class="btn-action btn-primary w-full" @click="emit('importData')">
              重新导入 JSON
            </button>
          </div>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-400">
          错误: {{ error }}
        </p>
        <button type="button" class="btn-action btn-gray mt-6 w-full" @click="emit('close')">
          关闭
        </button>
      </div>
    </div>
  </Teleport>
</template>
