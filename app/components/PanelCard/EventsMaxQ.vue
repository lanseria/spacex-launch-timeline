<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openDynamicTextModal'): void // 新增 emit
}>()

const {
  timestamps,
  nodeNames,
  addNode,
  deleteNode,
  // 移除了 maxQTitle 等直接的 ref，因为它们现在是 computed
  // 并且配置将通过 Modal 进行
  dynamicTextEntries, // 用于判断是否已有配置，可以用于按钮状态等
} = useSpaceTimeline()
</script>

<template>
  <div class="max-w-full flex flex-col border border-gray-700 rounded-lg bg-black/50 p-6 space-y-4">
    <div>
      <h2 class="mb-4 text-lg font-semibold">
        添加事件 (单位: 秒)
      </h2>
      <div class="node_list_scrollbar max-h-[150px] overflow-y-auto pr-2">
        <div v-for="(timestamp, i) in timestamps" :key="i" class="mb-2 flex items-center space-x-2">
          <input
            v-model.number="timestamps[i]"
            type="number"
            placeholder="例如: -60"
            class="input-field w-80px flex-grow bg-gray-700 text-white"
            :aria-label="`事件 ${i + 1} 的时间戳 (秒)`"
          >
          <input
            v-model="nodeNames[i]"
            type="text"
            placeholder="事件名称"
            class="input-field w-full flex-grow bg-gray-700 text-white"
            :aria-label="`事件 ${i + 1} 的名称`"
          >
          <button
            class="btn-action btn-danger" :class="[{ 'opacity-50 cursor-not-allowed': timestamps.length <= 1 }]"
            :disabled="timestamps.length <= 1"
            aria-label="删除事件"
            @click="deleteNode(i)"
          >
            -
          </button>
        </div>
      </div>
      <button
        class="btn-action btn-success mt-2 w-full"
        aria-label="添加新事件"
        @click="addNode"
      >
        + 添加事件
      </button>
    </div>

    <div class="my-1 border-t border-gray-600" />

    <!-- 修改后的动态文本配置区域 -->
    <div>
      <h2 class="mb-2 text-lg font-semibold">
        动态文本配置
      </h2>
      <p v-if="!dynamicTextEntries || dynamicTextEntries.length === 0" class="mb-2 text-sm text-gray-400">
        未配置动态文本，将显示默认 MAX-Q 信息。
      </p>
      <p v-else class="mb-2 text-sm text-green-400">
        已配置 {{ dynamicTextEntries.length }}条动态文本。
      </p>
      <button
        type="button"
        class="btn-action btn-info w-full"
        aria-label="配置动态显示文本"
        @click="emit('openDynamicTextModal')"
      >
        配置动态文本
      </button>
    </div>
  </div>
</template>
