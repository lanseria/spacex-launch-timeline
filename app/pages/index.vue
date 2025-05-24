<script setup lang="ts">
// pages/index.vue
const {
  missionName,
  vehicleName,
  currentSpeed,
  currentAltitude,
  backgroundImageUrl,
  showPanel,
  timestamps,
  nodeNames,
  missionTimeRaw,
  timeValueRaw,
  timerClock,
  isStarted,
  isPaused,
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
  restoreBackgroundImage,
} = useSpaceTimeline()

const panelRef = useTemplateRef<HTMLElement>('panelRef')
onClickOutside(panelRef, () => {
  showPanel.value = !showPanel.value
})

const controlButtonText = computed(() => {
  if (!isStarted.value)
    return '开始倒计时'
  if (isPaused.value)
    return '继续'
  return '暂停'
})

const { files: selectedFiles, open: openFileDialog, reset: resetFileDialog } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})

const currentFile = computed(() => selectedFiles.value?.[0] || null)
const localFileObjectUrl = useObjectUrl(currentFile)

watch(localFileObjectUrl, (newObjectUrl) => {
  if (newObjectUrl) {
    if (
      backgroundImageUrl.value?.startsWith('blob:')
      && backgroundImageUrl.value !== newObjectUrl
    ) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
    backgroundImageUrl.value = newObjectUrl
    triggerRef(backgroundImageUrl) // 确保响应式更新，尽管 useLocalStorage 通常会处理
  }
})

function handleRestoreBackgroundImage() {
  if (backgroundImageUrl.value?.startsWith('blob:')) {
    resetFileDialog()
  }
  restoreBackgroundImage()
}

onUnmounted(() => {
  resetFileDialog()
})
</script>

<template>
  <LayoutAdapter>
    <div class="h-full w-full left-0 top-0 fixed -z-1">
      <Head>
        <Title>SpaceX 发射时间线 - 主页</Title>
      </Head>

      <div class="mx-auto my-4 text-center relative z-10">
        <!-- 添加 relative z-10 确保在背景之上 -->
        <p class="text-40px text-white font-500 font-saira">
          {{ vehicleName }}
        </p>
      </div>

      <div ref="panelRef" class="mx-auto my-8 gap-4 grid grid-cols-3 w-1200px justify-center relative z-20">
        <!-- 卡片 1: 添加事件 -->
        <div v-if="showPanel" class="exclude-from-screenshot p-6 border border-gray-200 rounded-lg bg-black/50 max-w-full dark:border-gray-700">
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
        <div v-if="showPanel" class="exclude-from-screenshot p-6 border border-gray-200 rounded-lg bg-black/50 flex-1 max-w-full dark:border-gray-700">
          <h2 class="text-lg font-semibold mb-2">
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
            class="btn-action mt-2 bg-red-500 w-full hover:bg-red-600"
            :disabled="!isStarted && currentTimeOffset === initialCountdownOffset"
            aria-label="重置计时器"
            @click="resetTimer"
          >
            重置计时器
          </button>

          <h2 class="text-lg font-semibold mb-2 mt-2">
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
          <small class="text-xs text-gray-500 mb-4 block dark:text-gray-400">
            从T减多少秒开始倒计时，请输入正数。例如60代表从 T-60秒 开始。计时器运行时不可修改。
          </small>
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

        <!-- 卡片 3: 发射倒计时起点 & 任务配置 -->
        <div v-if="showPanel" class="exclude-from-screenshot p-6 border border-gray-200 rounded-lg bg-black/50 max-w-full dark:border-gray-700">
          <h2 class="text-lg font-semibold mb-2">
            任务与飞行数据配置
          </h2>
          <div class="space-y-3">
            <div>
              <label for="missionNameInput" class="text-sm text-gray-300 font-medium mb-1 block">任务名称</label>
              <input
                id="missionNameInput"
                v-model="missionName"
                type="text"
                placeholder="例如: Starlink"
                class="input-field w-full dark:text-white dark:bg-gray-700"
                aria-label="任务名称"
              >
            </div>
            <div>
              <label for="vehicleNameInput" class="text-sm text-gray-300 font-medium mb-1 block">运载工具</label>
              <input
                id="vehicleNameInput"
                v-model="vehicleName"
                max="10000"
                type="text"
                placeholder="例如: Falcon 9 Block 5"
                class="input-field w-full dark:text-white dark:bg-gray-700"
                aria-label="运载工具名称"
              >
            </div>
            <div>
              <label for="speedInput" class="text-sm text-gray-300 font-medium mb-1 block">当前速度 (KM/H)</label>
              <input
                id="speedInput"
                v-model.number="currentSpeed"
                type="number"
                max="100"
                placeholder="例如: 7501"
                class="input-field w-full dark:text-white dark:bg-gray-700"
                aria-label="当前速度 (KM/H)"
              >
            </div>
            <div>
              <label for="altitudeInput" class="text-sm text-gray-300 font-medium mb-1 block">当前高度 (KM)</label>
              <input
                id="altitudeInput"
                v-model.number="currentAltitude"
                type="number"
                placeholder="例如: 64"
                class="input-field w-full dark:text-white dark:bg-gray-700"
                aria-label="当前高度 (KM)"
              >
            </div>
            <h2 class="text-lg font-semibold mb-2">
              页面背景图
            </h2>
            <div class="mt-3 flex space-x-2">
              <button
                type="button"
                class="btn-action bg-sky-500 flex-1 hover:bg-sky-600"
                aria-label="选择本地背景图片"
                @click="openFileDialog()"
              >
                选择本地图片 (临时预览)
              </button>
              <button
                type="button"
                class="btn-action bg-orange-500 flex-1 hover:bg-orange-600"
                aria-label="还原背景图"
                :disabled="(!selectedFiles || selectedFiles.length === 0) && !backgroundImageUrl?.startsWith('blob:')"
                @click="handleRestoreBackgroundImage"
              >
                还原背景
              </button>
            </div>
            <small v-if="currentFile" class="text-xs text-gray-400 mt-1 block">
              当前预览: {{ currentFile.name }} (本地文件不会被保存) 可以点击背景隐藏面板
            </small>
          </div>
        </div>
      </div>

      <!-- 计时器时钟显示 (保持不变，但确保 z-index 合理) -->
      <div class="font-400 font-saira mx-auto text-center max-w-md bottom-16px left-1/2 fixed z-50 -translate-x-1/2">
        <div
          class="countdown text-42px text-white leading-tight"
        >
          {{ timerClock }}
        </div>
        <div
          class="text-sm text-gray-400 uppercase"
        >
          {{ missionName }}
        </div>
      </div>

      <!-- SVG 时间线可视化 (保持不变，但确保 z-index 合理) -->
      <TimelineSvg
        class="bottom-0 left-1/2 fixed z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
        :svg-width="1920"
        :svg-height="200"
        :past-node-density-factor="3"
        :future-node-density-factor="1"
      />
      <!-- Gauge 组件 (保持不变，但确保 z-index 合理) -->
      <TrapezoidGradient class="bottom-0 left-0 absolute z-1" />
      <div class="flex gap-4 bottom-10px left-60px absolute z-30">
        <Gauge
          label="SPEED"
          unit="KM/H"
          :value="currentSpeed"
          :max-value="10000"
        />
        <Gauge
          label="ALTITUDE"
          unit="KM"
          :value="currentAltitude"
          :max-value="100"
        />
      </div>

      <TrapezoidGradient class="bottom-0 right-0 absolute z-1" horizontal-flip />
      <div class="font-saira text-right bottom-30px right-50px absolute z-1">
        <div class="text-30px font-600">
          MAX-Q
        </div>
        <div>MAXIMUN DYNAMIC PRESSURE</div>
        <div>THIS IS THE LARGEST AMOUNT OF STRESS</div>
        <div>EXERTED ON THE VEHICLE</div>
      </div>
    </div> <!-- screenshotTargetRef div 结束 -->
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
