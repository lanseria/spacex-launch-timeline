<script setup lang="ts">
const {
  isStarted,
  isPaused,
  currentTimeOffset,
  initialCountdownOffset,
  toggleLaunch,
  resetTimer,
  jumpTargetTimeRaw,
  jumpToTime,
  timeValueRaw,
  missionTimeRaw,
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
  <div class="relative max-w-full flex-1 border border-gray-700 rounded-lg bg-black/50 p-6">
    <h2 class="mb-2 text-lg font-semibold">
      控制
    </h2>
    <button
      class="btn-action mb-2 w-full"
      :class="{
        'bg-blue-500 hover:bg-blue-600': !isStarted,
        'bg-yellow-500 hover:bg-yellow-600': isStarted && !isPaused,
        'bg-green-500 hover:bg-green-600': isStarted && isPaused,
      }"
      @click="toggleLaunch"
    >
      {{ controlButtonText }}
    </button>
    <button
      class="btn-action mt-2 w-full bg-red-500 hover:bg-red-600"
      :disabled="!isStarted && currentTimeOffset === initialCountdownOffset"
      aria-label="重置计时器"
      @click="resetTimer"
    >
      重置计时器
    </button>

    <h2 class="my-2 text-lg font-semibold">
      快速跳转 (秒)
    </h2>
    <div class="flex items-center space-x-2">
      <input
        v-model.number="jumpTargetTimeRaw"
        type="number"
        placeholder="例如: -30"
        class="input-field flex-grow bg-gray-700 text-white"
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
    <small class="mt-1 block text-xs text-gray-500">
      输入秒数 (负数T-, 正数T+)，回车或点击跳转。
    </small>

    <div class="my-4 border-t border-gray-600" />
    <h2 class="mb-2 text-lg font-semibold">
      发射倒计时起点 (秒)
    </h2>
    <input
      v-model.number="timeValueRaw"
      type="number"
      placeholder="例如: 60"
      class="input-field w-full bg-gray-700 text-white"
      aria-label="发射倒计时秒数 (正数)"
      :disabled="isStarted"
    >
    <small class="mb-4 block text-xs text-gray-500">
      从T减多少秒开始倒计时。例如60代表 T-60秒。
    </small>
    <h2 class="mb-2 text-lg font-semibold">
      时间轴总时长 (秒)
    </h2>
    <input
      v-model.number="missionTimeRaw"
      type="number"
      placeholder="例如: 3600"
      class="input-field w-full bg-gray-700 text-white"
      aria-label="时间轴总时长 (秒)"
    >
    <small class="text-xs text-gray-400 text-gray-500">
      定义圆周代表的总秒数。例3600秒, T-0在中心。
    </small>

    <!-- Author Signature (可以保留在这里，或移到 index.vue 的外部) -->
    <div class="absolute bottom-4 right-4 z-50 text-right text-xs text-gray-400/75 font-sans">
      <p class="text-red-500">
        点击下面时间轴隐藏控制面板
      </p>
      <p>作者: 爱吃包子的超</p>
      <p>
        B站主页:
        <a
          href="https://space.bilibili.com/8487409"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-gray-200"
        >
          B站主页
        </a>
      </p>
    </div>
  </div>
</template>
