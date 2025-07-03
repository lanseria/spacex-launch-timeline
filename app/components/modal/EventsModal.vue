<!-- app/components/modal/EventsModal.vue -->
<script setup lang="ts">
const props = defineProps<{
  show: boolean
  timestamps: number[]
  nodeNames: string[]
}>()

const emit = defineEmits([
  'close',
  'addNode',
  'deleteNode',
  'update:timestamps',
  'update:nodeNames',
])

const timestampsWritable = computed({
  get: () => props.timestamps,
  set: val => emit('update:timestamps', val),
})

const nodeNamesWritable = computed({
  get: () => props.nodeNames,
  set: val => emit('update:nodeNames', val),
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="emit('close')">
      <div class="exclude-from-screenshot m-4 max-w-lg w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
        <h2 class="mb-4 text-xl font-semibold">
          管理事件节点 (单位: 秒)
        </h2>
        <div class="node_list_scrollbar max-h-[40vh] overflow-y-auto pr-2">
          <div v-for="(timestamp, i) in timestampsWritable" :key="i" class="mb-2 flex items-center space-x-2">
            <input v-model.number="timestampsWritable[i]" type="number" placeholder="例如: -60" class="input-field w-80px flex-grow dark:bg-gray-700 dark:text-white" :aria-label="`事件 ${i + 1} 的时间戳 (秒)`">
            <input v-model="nodeNamesWritable[i]" type="text" placeholder="事件名称" class="input-field w-full flex-grow dark:bg-gray-700 dark:text-white" :aria-label="`事件 ${i + 1} 的名称`">
            <button class="btn-action bg-red-500 hover:bg-red-600" :disabled="timestamps.length <= 1" aria-label="删除事件" @click="emit('deleteNode', i)">
              -
            </button>
          </div>
        </div>
        <button class="btn-action mt-4 w-full bg-green-500 hover:bg-green-600" aria-label="添加新事件" @click="emit('addNode')">
          + 添加事件
        </button>
        <button type="button" class="btn-action mt-4 w-full bg-gray-600 hover:bg-gray-700" @click="emit('close')">
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

.btn-action:disabled {
  --at-apply: 'cursor-not-allowed bg-gray-700 opacity-70';
}

.node_list_scrollbar::-webkit-scrollbar {
  width: 8px;
  -webkit-appearance: none;
}

.node_list_scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgb(107 114 128 / 50%);
  -webkit-box-shadow: 0 0 1px rgb(255 255 255 / 50%);
}
.node_list_scrollbar::-webkit-scrollbar-track {
  background: rgb(31 41 55 / 50%);
  border-radius: 4px;
}
</style>
