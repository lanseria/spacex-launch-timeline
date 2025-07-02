<script setup lang="ts">
// pages/index.vue
const {
  missionName,
  vehicleName,
  currentSpeed,
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
  maxQTitle,
  maxQLine1,
  maxQLine2,
  maxQLine3,
  manualAltitude,
  altitudeProfile,
  currentAltitude,
  loadAltitudeProfile, // 这个函数仍然用于用户选择文件导入
  clearAltitudeProfile,
} = useSpaceTimeline()

const panelRef = useTemplateRef<HTMLElement>('panelRef')
const altitudeModalRef = useTemplateRef<HTMLElement>('altitudeModalRef')

const showAltitudeModal = ref(false)
const altitudeFileError = ref<string | null>(null)

onClickOutside(panelRef, (event) => {
  if (showAltitudeModal.value && altitudeModalRef.value?.contains(event.target as Node))
    return
  if (showPanel.value)
    showPanel.value = false
}, { ignore: [altitudeModalRef] })

const controlButtonText = computed(() => {
  if (!isStarted.value)
    return '开始倒计时'
  if (isPaused.value)
    return '继续'
  return '暂停'
})

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

const { files: selectedAltitudeFiles, open: openAltitudeFileDialog, reset: resetAltitudeFileDialog } = useFileDialog({
  accept: '.json',
  multiple: false,
})

watch(selectedAltitudeFiles, async (newFiles) => {
  const file = newFiles?.[0]
  if (file) {
    altitudeFileError.value = null
    try {
      await loadAltitudeProfile(file) // 使用 composable 中的函数
    }
    catch (error: any) {
      altitudeFileError.value = error.message || '加载或解析高度数据文件失败。'
      console.error('加载高度数据失败:', error)
    }
    finally {
      resetAltitudeFileDialog()
    }
  }
})

function handleImportAltitudeData() {
  altitudeFileError.value = null
  openAltitudeFileDialog()
}

// 新增：加载 Falcon 9 示例数据的函数
async function handleLoadFalcon9SampleData() {
  altitudeFileError.value = null
  try {
    const response = await fetch('/assets/data/falcon9_altitude_profile.json')
    if (!response.ok)
      throw new Error(`无法加载示例数据: ${response.statusText}`)

    const sampleData = await response.json()

    // 基础校验 (与 loadAltitudeProfile 中的类似)
    if (Array.isArray(sampleData) && sampleData.every(p => typeof p.time === 'number' && typeof p.altitude === 'number')) {
      altitudeProfile.value = sampleData as AltitudePoint[]
      // eslint-disable-next-line no-console
      console.log('Falcon 9 示例高度数据加载成功:', altitudeProfile.value)
    }
    else {
      throw new Error('示例数据格式无效。')
    }
  }
  catch (error: any) {
    altitudeFileError.value = error.message || '加载 Falcon 9 示例数据失败。'
    console.error('加载 Falcon 9 示例数据失败:', error)
  }
}

function handleClearAltitudeData() {
  clearAltitudeProfile()
  altitudeFileError.value = null
}

function handleOpenAltitudeModal() {
  showAltitudeModal.value = true
}

function handleCloseAltitudeModal() {
  showAltitudeModal.value = false
  altitudeFileError.value = null
}

onUnmounted(() => {
  resetBackgroundFileDialog()
  resetAltitudeFileDialog()
})
</script>

<template>
  <LayoutAdapter>
    <div class="fixed left-0 top-0 h-full w-full -z-1">
      <Head>
        <Title>SpaceX 发射时间线 - 主页</Title>
      </Head>

      <div class="relative z-10 mx-auto my-4 text-center">
        <p class="text-40px text-white font-500 font-saira">
          {{ vehicleName }}
        </p>
      </div>

      <div v-show="showPanel" ref="panelRef" class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
        <!-- 卡片 1: 添加事件 & MAX-Q 配置 -->
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
                <label for="maxQTitleInput" class="mb-1 block text-sm text-gray-300 font-medium">标题</label>
                <input
                  id="maxQTitleInput"
                  v-model="maxQTitle"
                  type="text"
                  class="input-field w-full dark:bg-gray-700 dark:text-white"
                  aria-label="MAX-Q 标题"
                >
              </div>
              <div>
                <label for="maxQLine1Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 1</label>
                <input
                  id="maxQLine1Input"
                  v-model="maxQLine1"
                  type="text"
                  class="input-field w-full dark:bg-gray-700 dark:text-white"
                  aria-label="MAX-Q 描述行 1"
                >
              </div>
              <div>
                <label for="maxQLine2Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 2</label>
                <input
                  id="maxQLine2Input"
                  v-model="maxQLine2"
                  type="text"
                  class="input-field w-full dark:bg-gray-700 dark:text-white"
                  aria-label="MAX-Q 描述行 2"
                >
              </div>
              <div>
                <label for="maxQLine3Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 3</label>
                <input
                  id="maxQLine3Input"
                  v-model="maxQLine3"
                  type="text"
                  class="input-field w-full dark:bg-gray-700 dark:text-white"
                  aria-label="MAX-Q 描述行 3"
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

        <!-- 卡片 3: 任务配置 & 高度曲线 -->
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
                v-model.number="manualAltitude"
                type="number"
                :max="1000"
                class="input-field w-full dark:bg-gray-700 dark:text-white"
                aria-label="当前高度 (KM)"
                :disabled="altitudeProfile && altitudeProfile.length > 0"
              >
              <small v-if="altitudeProfile && altitudeProfile.length > 0" class="mt-1 block text-xs text-yellow-400">
                高度由导入的曲线数据控制。
              </small>
            </div>
            <button
              type="button"
              class="btn-action w-full bg-purple-600 hover:bg-purple-700"
              aria-label="配置高度曲线数据"
              @click="handleOpenAltitudeModal"
            >
              配置高度曲线
            </button>

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
      <div
        class="fixed inset-0 z-0"
        aria-hidden="true"
        @click="() => { if (!showAltitudeModal) showPanel = !showPanel }"
      />

      <div class="fixed bottom-16px left-1/2 z-50 mx-auto max-w-md text-center font-400 font-saira -translate-x-1/2">
        <div
          class="flex items-center gap-1 leading-tight tabular-nums"
        >
          <div class="w-42px flex items-center gap-1 text-32px text-gray font-bold">
            <div>T</div><div>{{ timerClock.isPositive ? '+' : '-' }}</div>
          </div>
          <div class="text-42px text-white">
            {{ timerClock.timeString }}
          </div>
        </div>
        <div
          class="text-sm text-gray-400 uppercase"
        >
          {{ missionName }}
        </div>
      </div>

      <Falcon9V2TimelineSvg
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
        :svg-width="1920"
      />
      <TrapezoidGradient class="absolute bottom-40px left-0 z-1" />
      <div class="absolute bottom-10px left-60px z-30 flex gap-4">
        <Gauge
          label="SPEED"
          unit="KM/H"
          :value="currentSpeed"
          :max-value="30000"
        />
        <Gauge
          label="ALTITUDE"
          unit="KM"
          :value="currentAltitude"
          :max-value="700"
          :fraction-digits="1"
        />
      </div>

      <TrapezoidGradient class="absolute bottom-40px right-0 z-1" horizontal-flip />
      <div class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira">
        <div class="text-30px font-600">
          {{ maxQTitle }}
        </div>
        <div>{{ maxQLine1 }}</div>
        <div>{{ maxQLine2 }}</div>
        <div>{{ maxQLine3 }}</div>
      </div>
      <GradientBar class="absolute bottom-0 left-0 z-1" />
    </div>

    <Teleport to="body">
      <div v-if="showAltitudeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="handleCloseAltitudeModal">
        <div ref="altitudeModalRef" class="exclude-from-screenshot m-4 max-w-lg w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
          <h2 class="mb-4 text-xl font-semibold">
            高度曲线配置
          </h2>

          <div v-if="!altitudeProfile || altitudeProfile.length === 0" class="space-y-4">
            <p class="text-gray-300">
              当前未导入高度数据。请导入一个 JSON 文件，或加载内置示例数据。
            </p>
            <p class="text-sm text-gray-400">
              JSON 格式示例: `[{"time": 0, "altitude": 0.0}, ...]`
            </p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                class="btn-action w-full bg-blue-600 hover:bg-blue-700"
                @click="handleImportAltitudeData"
              >
                导入本地 JSON
              </button>
              <button
                type="button"
                class="btn-action w-full bg-teal-600 hover:bg-teal-700"
                @click="handleLoadFalcon9SampleData"
              >
                加载 Falcon 9 示例
              </button>
            </div>
          </div>
          <div v-else class="space-y-4">
            <p class="text-gray-300">
              已导入的高度数据点：
            </p>
            <div class="node_list_scrollbar max-h-[200px] overflow-y-auto border border-gray-700 rounded-md bg-gray-900/50 p-3">
              <ul>
                <li v-for="(point, index) in altitudeProfile" :key="index" class="flex justify-between py-1 text-sm">
                  <span>时间 (T{{ point.time >= 0 ? '+' : '' }}{{ point.time }}s):</span>
                  <span>{{ point.altitude.toFixed(1) }} KM</span>
                </li>
              </ul>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <button
                type="button"
                class="btn-action w-full bg-red-600 hover:bg-red-700"
                @click="handleClearAltitudeData"
              >
                清空数据
              </button>
              <button
                type="button"
                class="btn-action w-full bg-blue-600 hover:bg-blue-700"
                @click="handleImportAltitudeData"
              >
                重新导入 JSON
              </button>
            </div>
          </div>

          <p v-if="altitudeFileError" class="mt-3 text-sm text-red-400">
            错误: {{ altitudeFileError }}
          </p>

          <button
            type="button"
            class="btn-action mt-6 w-full bg-gray-600 hover:bg-gray-700"
            @click="handleCloseAltitudeModal"
          >
            关闭
          </button>
        </div>
      </div>
    </Teleport>
  </LayoutAdapter>
</template>

<style scoped>
/* 样式保持不变 */
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
