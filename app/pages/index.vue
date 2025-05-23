<script setup lang="ts">
// pages/index.vue
const {
  missionNameDisplay,
  vehicleNameDisplay,
  timestamps,
  nodeNames,
  missionTimeRaw,
  timeValueRaw, // 这个是初始倒计时起点秒数 (正数)
  timerClock,
  isStarted,
  isPaused,
  // isTPlus,
  initialCountdownOffset,
  processedTimestamps,
  missionTimeSeconds,
  currentTimeOffset,
  jumpTargetTimeRaw,
  addNode,
  deleteNode,
  toggleLaunch,
  resetTimer,
  jumpToTime,
} = useSpaceTimeline()

const controlButtonText = computed(() => {
  if (!isStarted.value)
    return '开始倒计时'
  if (isPaused.value)
    return '继续'
  return '暂停'
})
</script>

<template>
  <LayoutAdapter>
    <Head>
      <Title>SpaceX 发射时间线 - 主页</Title>
    </Head>

    <div class="mx-auto my-4 text-center">
      <h1 class="text-2xl font-bold">
        {{ missionNameDisplay }}
      </h1>
      <p class="text-md text-gray-400">
        {{ vehicleNameDisplay }}
      </p>
    </div>

    <div class="mx-auto my-8 gap-4 grid grid-cols-3 w-1200px justify-center">
      <!-- 卡片 1: 添加事件 (保持不变) -->
      <div class="p-6 border border-gray-200 rounded-lg bg-black/50 max-w-full dark:border-gray-700">
        <h2 class="text-lg font-semibold mb-4">
          添加事件 (单位: 秒)
        </h2>
        <div class="node_list_scrollbar max-h-[200px] overflow-y-auto">
          <div v-for="(timestamp, i) in timestamps" :key="i" class="mb-2 flex items-center space-x-2">
            <input
              v-model.number="timestamps[i]"
              type="number"
              placeholder="例如: -60, 0, 120"
              class="input-field flex-grow w-80px dark:text-white dark:bg-gray-700"
              :aria-label="`事件 ${i + 1} 的时间戳 (秒)`"
            >
            <input
              v-model="nodeNames[i]"
              type="text"
              placeholder="事件名称"
              class="input-field flex-grow w-full dark:text-white dark:bg-gray-700"
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
          class="btn-action mt-2 bg-green-500 w-full hover:bg-green-600"
          aria-label="添加新事件"
          @click="addNode"
        >
          + 添加事件
        </button>
      </div>

      <!-- 卡片 2: 控制 & SVG总时长 -->
      <div class="p-6 border border-gray-200 rounded-lg bg-black/50 flex-1 max-w-full dark:border-gray-700">
        <h2 class="text-lg font-semibold mb-2">
          控制
        </h2>
        <button
          class="btn-action mb-2 w-full"
          :class="{
            'bg-blue-500 hover:bg-blue-600': !isStarted, // 开始
            'bg-yellow-500 hover:bg-yellow-600': isStarted && !isPaused, // 暂停
            'bg-green-500 hover:bg-green-600': isStarted && isPaused, // 继续
          }"
          @click="toggleLaunch"
        >
          {{ controlButtonText }}
        </button>
        <button
          class="btn-action mt-2 bg-red-500 w-full hover:bg-red-600"
          :disabled="!isStarted && currentTimeOffset === initialCountdownOffset"
          aria-label="重置计时器"
          @click="resetTimer"
        >
          重置计时器
        </button>

        <div class="my-4 border-t border-gray-300 dark:border-gray-600" />

        <h2 class="text-lg font-semibold mb-2">
          快速跳转 (秒)
        </h2>
        <div class="flex items-center space-x-2">
          <input
            v-model.number="jumpTargetTimeRaw"
            type="number"
            placeholder="例如: -30, 0, 120"
            class="input-field flex-grow dark:text-white dark:bg-gray-700"
            aria-label="跳转到的时间点 (秒)"
            @keyup.enter="jumpToTime"
          >
          <button
            class="btn-action bg-indigo-500 hover:bg-indigo-600"
            aria-label="跳转到指定时间"
            @click="jumpToTime"
          >
            跳转
          </button>
        </div>
        <small class="text-xs text-gray-500 mt-1 block dark:text-gray-400">
          输入秒数 (负数T-, 正数T+)，回车或点击跳转。
        </small>

        <div class="my-4 border-t border-gray-300 dark:border-gray-600" />

        <h2 class="text-lg font-semibold mb-2">
          SVG时间轴总时长 (秒)
        </h2>
        <input
          v-model.number="missionTimeRaw"
          type="number"
          placeholder="例如: 3600"
          class="input-field w-full dark:text-white dark:bg-gray-700"
          aria-label="SVG时间轴总时长 (秒)"
        >
        <small class="text-xs text-gray-500 dark:text-gray-400">
          定义SVG圆周代表的总秒数。例如3600秒，若T-0在中心，则显示范围约 T±1800秒。
        </small>
      </div>

      <!-- 卡片 3: 发射倒计时起点 (保持不变) -->
      <div class="p-6 border border-gray-200 rounded-lg bg-black/50 max-w-full dark:border-gray-700">
        <h2 class="text-lg font-semibold mb-2">
          发射倒计时起点 (秒)
        </h2>
        <input
          v-model.number="timeValueRaw"
          type="number"
          placeholder="例如: 60 (从T-60秒开始)"
          class="input-field w-full dark:text-white dark:bg-gray-700"
          aria-label="发射倒计时秒数 (正数)"
          :disabled="isStarted"
        >
        <small class="text-xs text-gray-500 dark:text-gray-400">
          从T减多少秒开始倒计时，请输入正数。例如60代表从 T-60秒 开始。计时器运行时不可修改。
        </small>
      </div>
    </div>

    <!-- 计时器时钟显示 (保持不变) -->
    <div class="font-400 font-saira mx-auto text-center max-w-md bottom-16px left-1/2 fixed z-100 -translate-x-1/2">
      <div
        class="countdown text-42px text-white leading-tight"
      >
        {{ timerClock }}
      </div>
      <div
        class="text-sm text-gray-400"
      >
        STARLINK
      </div>
    </div>

    <!-- SVG 时间线可视化 (保持不变) -->
    <TimelineSvg
      :timestamps="processedTimestamps"
      :node-names="nodeNames"
      :mission-duration="missionTimeSeconds"
      :current-time-offset="currentTimeOffset"
      :svg-width="1920"
      :svg-height="200"
      :past-node-density-factor="3"
      :future-node-density-factor="1"
    />
  </LayoutAdapter>
</template>

<style scoped>
/* 样式保持不变 */
.countdown {
  font-variant-numeric: tabular-nums;
}
.input-field {
  @apply block rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-offset-gray-900;
}

.btn-action {
  @apply rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2;
}

.btn-action:disabled {
  @apply cursor-not-allowed bg-gray-300 dark:bg-gray-700;
}

.node_list_scrollbar::-webkit-scrollbar {
  width: 1px;
  -webkit-appearance: none;
}

.node_list_scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background-color: rgb(0 0 0 / 50%);
  -webkit-box-shadow: 0 0 1px rgb(255 255 255 / 50%);
}
</style>
