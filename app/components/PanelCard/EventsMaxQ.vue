<script setup lang="ts">
const {
  timestamps,
  nodeNames,
  addNode,
  deleteNode,
  maxQTitle,
  maxQLine1,
  maxQLine2,
  maxQLine3,
} = useSpaceTimeline()
</script>

<template>
  <div class="exclude-from-screenshot max-w-full flex flex-col border border-gray-200 rounded-lg bg-black/50 p-6 space-y-4 dark:border-gray-700">
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
            class="input-field w-80px flex-grow dark:bg-gray-700 dark:text-white"
            :aria-label="`事件 ${i + 1} 的时间戳 (秒)`"
          >
          <input
            v-model="nodeNames[i]"
            type="text"
            placeholder="事件名称"
            class="input-field w-full flex-grow dark:bg-gray-700 dark:text-white"
            :aria-label="`事件 ${i + 1} 的名称`"
          >
          <button
            class="btn-action bg-red-500 hover:bg-red-600"
            :disabled="timestamps.length <= 1"
            aria-label="删除事件"
            @click="deleteNode(i)"
          >
            -
          </button>
        </div>
      </div>
      <button
        class="btn-action mt-2 w-full bg-green-500 hover:bg-green-600"
        aria-label="添加新事件"
        @click="addNode"
      >
        + 添加事件
      </button>
    </div>
    <div class="my-1 border-t border-gray-600" />
    <div>
      <h2 class="mb-2 text-lg font-semibold">
        MAX-Q 显示文本配置
      </h2>
      <div class="space-y-1">
        <div>
          <label for="maxQTitleInputCard1" class="mb-1 block text-sm text-gray-300 font-medium">标题</label>
          <input
            id="maxQTitleInputCard1"
            v-model="maxQTitle"
            type="text"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="MAX-Q 标题"
          >
        </div>
        <div>
          <label for="maxQLine1InputCard1" class="mb-1 block text-sm text-gray-300 font-medium">描述行 1</label>
          <input
            id="maxQLine1InputCard1"
            v-model="maxQLine1"
            type="text"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="MAX-Q 描述行 1"
          >
        </div>
        <div>
          <label for="maxQLine2InputCard1" class="mb-1 block text-sm text-gray-300 font-medium">描述行 2</label>
          <input
            id="maxQLine2InputCard1"
            v-model="maxQLine2"
            type="text"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="MAX-Q 描述行 2"
          >
        </div>
        <div>
          <label for="maxQLine3InputCard1" class="mb-1 block text-sm text-gray-300 font-medium">描述行 3</label>
          <input
            id="maxQLine3InputCard1"
            v-model="maxQLine3"
            type="text"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="MAX-Q 描述行 3"
          >
        </div>
      </div>
    </div>
  </div>
</template>
