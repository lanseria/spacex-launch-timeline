<script setup lang="ts">
import type { SpeedPoint } from '~/composables/useSpaceTimeline'

const props = defineProps<{
  showModal: boolean
  speedProfile: SpeedPoint[] | null
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'importData'): void
  (e: 'loadSampleData'): void
  (e: 'clearData'): void
}>()

const modalRef = useTemplateRef<HTMLElement>('speedModalInnerRef')
onClickOutside(modalRef, () => {
  if (props.showModal)
    emit('close')
})
</script>

<template>
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
      <div ref="modalRef" class="exclude-from-screenshot m-4 max-w-lg w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
        <h2 class="mb-4 text-xl font-semibold">
          速度曲线配置
        </h2>
        <div v-if="!speedProfile || speedProfile.length === 0" class="space-y-4">
          <p class="text-gray-300">
            当前未导入速度数据。请导入 JSON 或加载示例。
          </p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" class="btn-action w-full bg-blue-600 hover:bg-blue-700" @click="emit('importData')">
              导入本地 JSON
            </button>
            <button type="button" class="btn-action w-full bg-teal-600 hover:bg-teal-700" @click="emit('loadSampleData')">
              加载 Falcon 9 示例
            </button>
          </div>
        </div>
        <div v-else class="space-y-4">
          <p class="text-gray-300">
            已导入的速度数据点：
          </p>
          <div class="node_list_scrollbar max-h-[200px] overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50 p-3">
            <ul>
              <li v-for="(point, index) in speedProfile" :key="index" class="flex justify-between py-1 text-sm">
                <span>时间 (T{{ point.time >= 0 ? '+' : '' }}{{ point.time }}s):</span>
                <span>{{ Math.round(point.speed) }} KM/H</span>
              </li>
            </ul>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <button type="button" class="btn-action w-full bg-red-600 hover:bg-red-700" @click="emit('clearData')">
              清空数据
            </button>
            <button type="button" class="btn-action w-full bg-blue-600 hover:bg-blue-700" @click="emit('importData')">
              重新导入 JSON
            </button>
          </div>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-400">
          错误: {{ error }}
        </p>
        <button type="button" class="btn-action mt-6 w-full bg-gray-600 hover:bg-gray-700" @click="emit('close')">
          关闭
        </button>
      </div>
    </div>
  </Teleport>
</template>
