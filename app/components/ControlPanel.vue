<!-- app/components/ControlPanel.vue -->
<script setup lang="ts">
// 这个新组件直接调用 useSpaceTimeline 来获取所有需要的状态和方法
const {
  timestamps,
  nodeNames,
  displayInfo,
  missionName,
  vehicleName,
  currentSpeed,
  currentAltitude,
  backgroundImageUrl,
  missionTimeRaw,
  timeValueRaw,
  isStarted,
  initialCountdownOffset,
  currentTimeOffset,
  jumpTargetTimeRaw,
  isPaused,
  addNode,
  deleteNode,
  toggleLaunch,
  resetTimer,
  jumpToTime,
  restoreBackgroundImage,
} = useSpaceTimeline()

// 从 index.vue 移过来的控制按钮文本计算属性
const controlButtonText = computed(() => {
  if (!isStarted.value)
    return '开始倒计时'
  if (isPaused.value)
    return '继续'
  return '暂停'
})

// 从 index.vue 移过来的文件对话框逻辑
const { files: selectedBackgroundFiles, open: openBackgroundFileDialog, reset: resetBackgroundFileDialog } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})
const currentBackgroundFile = computed(() => selectedBackgroundFiles.value?.[0] || null)
const localBackgroundFileObjectUrl = useObjectUrl(currentBackgroundFile)

watch(localBackgroundFileObjectUrl, (newObjectUrl) => {
  if (newObjectUrl) {
    if (backgroundImageUrl.value?.startsWith('blob:') && backgroundImageUrl.value !== newObjectUrl)
      URL.revokeObjectURL(backgroundImageUrl.value)
    backgroundImageUrl.value = newObjectUrl
    triggerRef(backgroundImageUrl)
  }
})

function handleRestoreBackgroundImage() {
  if (backgroundImageUrl.value?.startsWith('blob:'))
    resetBackgroundFileDialog()
  restoreBackgroundImage()
}

onUnmounted(() => {
  resetBackgroundFileDialog()
})
</script>

<template>
  <!-- 这是从 index.vue 剪切过来的整个面板 div -->
  <div class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
    <!-- 卡片 1: 添加事件 & 显示文本配置 -->
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
          右下角显示文本配置
        </h2>
        <div class="space-y-1">
          <div>
            <label for="displayInfoTitleInput" class="mb-1 block text-sm text-gray-300 font-medium">标题</label>
            <input
              id="displayInfoTitleInput"
              v-model="displayInfo.title"
              type="text"
              class="input-field w-full dark:bg-gray-700 dark:text-white"
              aria-label="显示文本标题"
            >
          </div>
          <div>
            <label for="displayInfoLine1Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 1</label>
            <input
              id="displayInfoLine1Input"
              v-model="displayInfo.line1"
              type="text"
              class="input-field w-full dark:bg-gray-700 dark:text-white"
              aria-label="显示文本描述行 1"
            >
          </div>
          <div>
            <label for="displayInfoLine2Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 2</label>
            <input
              id="displayInfoLine2Input"
              v-model="displayInfo.line2"
              type="text"
              class="input-field w-full dark:bg-gray-700 dark:text-white"
              aria-label="显示文本描述行 2"
            >
          </div>
          <div>
            <label for="displayInfoLine3Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 3</label>
            <input
              id="displayInfoLine3Input"
              v-model="displayInfo.line3"
              type="text"
              class="input-field w-full dark:bg-gray-700 dark:text-white"
              aria-label="显示文本描述行 3"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 卡片 2: 控制 & SVG总时长 -->
    <div class="exclude-from-screenshot max-w-full flex-1 border border-gray-200 rounded-lg bg-black/50 p-6 dark:border-gray-700">
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

      <h2 class="mb-2 mt-2 text-lg font-semibold">
        快速跳转 (秒)
      </h2>
      <div class="flex items-center space-x-2">
        <input
          v-model.number="jumpTargetTimeRaw"
          type="number"
          placeholder="例如: -30"
          class="input-field flex-grow dark:bg-gray-700 dark:text-white"
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
      <small class="mt-1 block text-xs text-gray-500 dark:text-gray-400">
        输入秒数 (负数T-, 正数T+)，回车或点击跳转。
      </small>

      <div class="my-4 border-t border-gray-300 dark:border-gray-600" />
      <h2 class="mb-2 text-lg font-semibold">
        发射倒计时起点 (秒)
      </h2>
      <input
        v-model.number="timeValueRaw"
        type="number"
        placeholder="例如: 60"
        class="input-field w-full dark:bg-gray-700 dark:text-white"
        aria-label="发射倒计时秒数 (正数)"
        :disabled="isStarted"
      >
      <small class="mb-4 block text-xs text-gray-500 dark:text-gray-400">
        从T减多少秒开始倒计时。例如60代表 T-60秒。
      </small>
      <h2 class="mb-2 text-lg font-semibold">
        时间轴总时长 (秒)
      </h2>
      <input
        v-model.number="missionTimeRaw"
        type="number"
        placeholder="例如: 3600"
        class="input-field w-full dark:bg-gray-700 dark:text-white"
        aria-label="时间轴总时长 (秒)"
      >
      <small class="text-xs text-gray-500 dark:text-gray-400">
        定义圆周代表的总秒数。例3600秒, T-0在中心。
      </small>
    </div>

    <!-- 卡片 3: 任务配置 -->
    <div class="exclude-from-screenshot relative max-w-full border border-gray-200 rounded-lg bg-black/50 p-6 dark:border-gray-700">
      <h2 class="mb-2 text-lg font-semibold">
        任务与飞行数据配置
      </h2>
      <div class="space-y-3">
        <div>
          <label for="missionNameInput" class="mb-1 block text-sm text-gray-300 font-medium">任务名称</label>
          <input id="missionNameInput" v-model="missionName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="任务名称">
        </div>
        <div>
          <label for="vehicleNameInput" class="mb-1 block text-sm text-gray-300 font-medium">运载工具</label>
          <input id="vehicleNameInput" v-model="vehicleName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="运载工具名称">
        </div>
        <div>
          <label for="speedInput" class="mb-1 block text-sm text-gray-300 font-medium">当前速度 (KM/H)</label>
          <input
            id="speedInput"
            v-model.number="currentSpeed"
            type="number"
            :max="30000"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="当前速度 (KM/H)"
          >
        </div>
        <div>
          <label for="altitudeInput" class="mb-1 block text-sm text-gray-300 font-medium">当前高度 (KM)</label>
          <input
            id="altitudeInput"
            v-model.number="currentAltitude"
            type="number"
            :max="1000"
            class="input-field w-full dark:bg-gray-700 dark:text-white"
            aria-label="当前高度 (KM)"
          >
        </div>

        <h2 class="mb-2 pt-2 text-lg font-semibold">
          页面背景图
        </h2>
        <div class="flex space-x-2">
          <button
            type="button"
            class="btn-action flex-1 bg-sky-500 hover:bg-sky-600"
            aria-label="选择本地背景图片"
            @click="openBackgroundFileDialog()"
          >
            选择本地图片
          </button>
          <button
            type="button"
            class="btn-action flex-1 bg-orange-500 hover:bg-orange-600"
            aria-label="还原背景图"
            :disabled="(!currentBackgroundFile) && !backgroundImageUrl?.startsWith('blob:')"
            @click="handleRestoreBackgroundImage"
          >
            还原背景
          </button>
        </div>
        <small v-if="currentBackgroundFile" class="mt-1 block text-xs text-gray-400">
          当前预览: {{ currentBackgroundFile.name }} (本地文件不会被保存)
        </small>
        <small v-else-if="backgroundImageUrl?.startsWith('blob:')" class="mt-1 block text-xs text-gray-400">
          当前为本地预览背景 (不会被保存)
        </small>
      </div>

      <div class="absolute bottom-4 right-4 z-50 text-right text-xs text-gray-400/75 font-sans">
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
  </div>
</template>

<style scoped>
/* 从 index.vue 剪切过来的样式 */
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
