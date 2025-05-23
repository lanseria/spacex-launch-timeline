<script setup lang="ts">
// pages/index.vue
const {
  missionName, // 修改: 替换 missionNameDisplay
  vehicleName, // 修改: 替换 vehicleNameDisplay
  currentSpeed, // 新增
  currentAltitude, // 新增
  persistedBackgroundImageUrl, // 从 composable 获取
  restoreBackgroundImage, // 从 composable 获取
  timestamps,
  nodeNames,
  missionTimeRaw,
  timeValueRaw,
  timerClock,
  isStarted,
  isPaused,
  // isTPlus, // 如果模板中没用到，可以考虑移除
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

const { files: selectedFiles, open: openFileDialog, reset: resetFileDialog } = useFileDialog({
  accept: 'image/*', // 只接受图片文件
  multiple: false,
})

// useObjectUrl 需要一个 ref 作为参数，该 ref 包含 File 对象
// selectedFiles 是 Ref<FileList | null>，我们需要从中取出单个 File
const currentFile = computed(() => selectedFiles.value?.[0] || null)
const localFileObjectUrl = useObjectUrl(currentFile) // 如果 currentFile 为 null, localFileObjectUrl 也为 null

// 监视通过文件对话框选择的本地文件生成的 Object URL
watch(localFileObjectUrl, (newObjectUrl) => {
  if (newObjectUrl) {
    // 如果之前 persistedBackgroundImageUrl 是一个 (不同的) Object URL，先释放它
    if (
      persistedBackgroundImageUrl.value?.startsWith('blob:')
      && persistedBackgroundImageUrl.value !== newObjectUrl
    ) {
      URL.revokeObjectURL(persistedBackgroundImageUrl.value)
    }
    persistedBackgroundImageUrl.value = newObjectUrl // 更新当前显示的背景为新的 Object URL
    triggerRef(persistedBackgroundImageUrl)
  }
  else {
    // 如果 newObjectUrl 为 null (例如取消选择或重置了文件对话框),
    // 并且当前显示的是一个 blob URL (通常是刚刚被revoke的那个),
    // 那么应该尝试恢复到持久化的 URL。
    // 但这个场景通常由 restoreBackgroundImage 或直接修改 persistedBackgroundImageUrl 处理。
    // 这里主要确保如果 objectUrl 没了，不要让 currentBackgroundImageDisplayUrl 意外地保持旧的 blob。
    // 如果是从有 objectUrl 变为无 objectUrl（比如调用了resetFileDialog），
    // 我们期望的是恢复到 persisted URL，这应该通过 handleRestoreBackgroundImage 来触发
  }
})

function handleRestoreBackgroundImage() {
  // 如果当前是本地文件预览，则清空文件选择器，这会触发 localFileObjectUrl 变为 null
  // 并且 useObjectUrl 应该会 revoke 之前的 Object URL
  if (persistedBackgroundImageUrl.value?.startsWith('blob:')) {
    resetFileDialog() // 清空文件选择，这会导致 localFileObjectUrl 更新为 null
  }
  // 然后调用 composable 中的还原函数，它会处理 revoke (如果需要) 并设置回 persisted URL
  restoreBackgroundImage()
}

// 确保在组件卸载时，如果存在由 useFileDialog 创建的 Object URL，它被正确处理
// useObjectUrl 通常会在其源 ref (currentFile) 变化或组件卸载时自动 revoke
onUnmounted(() => {
  // resetFileDialog() // 调用 resetFileDialog 会将 selectedFiles 置空，从而 currentFile 也为空，useObjectUrl 会处理
  // 主动 revoke 也可以，但要小心与 useObjectUrl 的内置行为冲突。
  // restoreBackgroundImage() 里的 revoke 和 onBeforeUnmount 里的 revoke 应该足够了。
  // 这里确保 FileDialog 的状态被清理。
  resetFileDialog() // 重置文件选择器状态
})
</script>

<template>
  <LayoutAdapter>
    <Head>
      <Title>SpaceX 发射时间线 - 主页</Title>
    </Head>

    <div class="mx-auto my-4 text-center">
      <p class="text-40px text-white font-700 font-saira">
        {{ vehicleName }} <!-- 修改: 使用 vehicleName ref -->
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

      <!-- 卡片 2: 控制 & SVG总时长 (保持不变) -->
      <div class="p-6 border border-gray-200 rounded-lg bg-black/50 flex-1 max-w-full dark:border-gray-700">
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
        <small class="text-xs text-gray-500 mb-4 block dark:text-gray-400"> <!-- 增加了 mb-4 和 block -->
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
      <div class="p-6 border border-gray-200 rounded-lg bg-black/50 max-w-full dark:border-gray-700">
        <h2 class="text-lg font-semibold mb-2">
          任务与飞行数据配置
        </h2>
        <div class="space-y-3">
          <!-- 使用 space-y 来自动添加子元素间距 -->
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
          <div>
            <label for="backgroundUrlInput" class="text-sm text-gray-300 font-medium mb-1 block">背景图 URL (持久化)</label>
            <input
              id="backgroundUrlInput"
              v-model="persistedBackgroundImageUrl"
              type="text"
              placeholder="输入图片 URL 或 public 路径"
              class="input-field w-full dark:text-white dark:bg-gray-700"
              aria-label="页面背景图 URL (此URL会保存)"
            >
            <small class="text-xs text-gray-500 mt-1 block dark:text-gray-400">
              此输入框内容会被保存并在下次打开时加载。
            </small>
          </div>

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
              :disabled="(!selectedFiles || selectedFiles.length === 0)"
              @click="handleRestoreBackgroundImage"
            >
              还原背景
            </button>
          </div>
          <small v-if="currentFile" class="text-xs text-gray-400 mt-1 block">
            当前预览: {{ currentFile.name }} (本地文件不会被保存)
          </small>
        </div>
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
        class="text-sm text-gray-400 uppercase"
      >
        {{ missionName }} <!-- 修改: 使用 missionName ref -->
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
    <div class="flex gap-4 bottom-10px left-60px absolute">
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
