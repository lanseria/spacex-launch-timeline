<!-- app/components/ControlPanel.vue -->
<script setup lang="ts">
import type { DisplayInfo } from '~/types'

// [修改] 接收所有需要的数据作为 props
const props = defineProps<{
  timestamps: number[]
  nodeNames: string[]
  displayInfo: DisplayInfo
  missionName: string
  vehicleName: string
  currentSpeed: number
  currentAltitude: number
  fuelPercentage: number
  gForce: number
  backgroundImageUrl: string | null
  missionTimeRaw: number
  timeValueRaw: number
  isStarted: boolean
  isPaused: boolean
  initialCountdownOffset: number
  currentTimeOffset: number
  jumpTargetTimeRaw: string | number
}>()

// [修改] 定义组件要发出的事件
const emit = defineEmits([
  'addNode',
  'deleteNode',
  'toggleLaunch',
  'resetTimer',
  'jumpToTime',
  'restoreBackgroundImage',
  'openBackgroundDialog',
  'update:timestamps',
  'update:nodeNames',
  'update:displayInfo',
  'update:missionName',
  'update:vehicleName',
  'update:currentSpeed',
  'update:currentAltitude',
  'update:fuelPercentage',
  'update:gForce',
  'update:missionTimeRaw',
  'update:timeValueRaw',
  'update:jumpTargetTimeRaw',
])

// [新增] 为 props 创建可写的 computed 属性，以实现 v-model 的双向绑定
const missionNameWritable = computed({
  get: () => props.missionName,
  set: val => emit('update:missionName', val),
})
const vehicleNameWritable = computed({
  get: () => props.vehicleName,
  set: val => emit('update:vehicleName', val),
})
// ... 为所有需要 v-model 的 props 创建类似的 computed ...
const timestampsWritable = computed({
  get: () => props.timestamps,
  set: val => emit('update:timestamps', val),
})
const nodeNamesWritable = computed({
  get: () => props.nodeNames,
  set: val => emit('update:nodeNames', val),
})
const displayInfoWritable = computed({
  get: () => props.displayInfo,
  set: val => emit('update:displayInfo', val),
})
const currentSpeedWritable = computed({
  get: () => props.currentSpeed,
  set: val => emit('update:currentSpeed', val),
})
const currentAltitudeWritable = computed({
  get: () => props.currentAltitude,
  set: val => emit('update:currentAltitude', val),
})
const fuelPercentageWritable = computed({
  get: () => props.fuelPercentage,
  set: val => emit('update:fuelPercentage', val),
})
const gForceWritable = computed({
  get: () => props.gForce,
  set: val => emit('update:gForce', val),
})
const missionTimeRawWritable = computed({
  get: () => props.missionTimeRaw,
  set: val => emit('update:missionTimeRaw', val),
})
const timeValueRawWritable = computed({
  get: () => props.timeValueRaw,
  set: val => emit('update:timeValueRaw', val),
})
const jumpTargetTimeRawWritable = computed({
  get: () => props.jumpTargetTimeRaw,
  set: val => emit('update:jumpTargetTimeRaw', val),
})

// 控制模态框显示的状态 (这部分逻辑保留在组件内部)
const showEventsModal = ref(false)
const showDisplayInfoModal = ref(false)

const controlButtonText = computed(() => {
  if (!props.isStarted)
    return '开始倒计时'
  if (props.isPaused)
    return '继续'
  return '暂停'
})

// 背景图逻辑现在只发出事件
const { files: selectedBackgroundFiles, open: openBackgroundFileDialog } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})
const currentBackgroundFile = computed(() => selectedBackgroundFiles.value?.[0] || null)

watch(currentBackgroundFile, () => {
  // 当用户选择文件时，通知父组件
  emit('openBackgroundDialog', currentBackgroundFile.value)
})
</script>

<template>
  <div>
    <!-- 新增一个外层 div 以便 Teleport 正常工作 -->
    <div class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
      <!-- 卡片 1: 使用 writable computed -->
      <div class="exclude-from-screenshot max-w-full flex flex-col border border-gray-200 rounded-lg bg-black/50 p-6 space-y-4 dark:border-gray-700">
        <h2 class="text-lg font-semibold">
          主要配置
        </h2>
        <div>
          <label for="missionNameInput" class="mb-1 block text-sm text-gray-300 font-medium">任务名称</label>
          <input id="missionNameInput" v-model="missionNameWritable" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="任务名称">
        </div>
        <div>
          <label for="vehicleNameInput" class="mb-1 block text-sm text-gray-300 font-medium">运载工具</label>
          <input id="vehicleNameInput" v-model="vehicleNameWritable" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="运载工具名称">
        </div>
        <div class="my-2 border-t border-gray-600" />
        <div class="space-y-3">
          <button class="btn-action w-full bg-indigo-600 hover:bg-indigo-700" @click="showEventsModal = true">
            管理事件节点
          </button>
          <button class="btn-action w-full bg-purple-600 hover:bg-purple-700" @click="showDisplayInfoModal = true">
            配置右下角文本
          </button>
        </div>
      </div>

      <!-- 卡片 2: 控制 & SVG总时长 (保持不变) -->
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
          @click="emit('toggleLaunch')"
        >
          {{ controlButtonText }}
        </button>
        <button
          class="btn-action mt-2 w-full bg-red-500 hover:bg-red-600"
          :disabled="!isStarted && currentTimeOffset === initialCountdownOffset"
          aria-label="重置计时器"
          @click="emit('resetTimer')"
        >
          重置计时器
        </button>
        <h2 class="mb-2 mt-2 text-lg font-semibold">
          快速跳转 (秒)
        </h2>
        <div class="flex items-center space-x-2">
          <input v-model="jumpTargetTimeRawWritable" type="number" class="input-field flex-grow" @keyup.enter="emit('jumpToTime')">
          <button
            class="btn-action bg-indigo-500 hover:bg-indigo-600"
            aria-label="跳转到指定时间"
            @click="emit('jumpToTime')"
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
          v-model="timeValueRawWritable"
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
          v-model.number="missionTimeRawWritable"
          type="number"
          placeholder="例如: 3600"
          class="input-field w-full dark:bg-gray-700 dark:text-white"
          aria-label="时间轴总时长 (秒)"
        >
        <small class="text-xs text-gray-500 dark:text-gray-400">
          定义圆周代表的总秒数。例3600秒, T-0在中心。
        </small>
      </div>

      <!-- [修改] 卡片 3: 飞行数据 & 页面背景 -->
      <div class="exclude-from-screenshot relative max-w-full border border-gray-200 rounded-lg bg-black/50 p-6 dark:border-gray-700">
        <h2 class="mb-2 text-lg font-semibold">
          飞行数据与页面配置
        </h2>
        <div class="space-y-3">
          <div>
            <label for="speedInput" class="mb-1 block text-sm text-gray-300 font-medium">当前速度 (KM/H)</label>
            <input id="speedInput" v-model.number="currentSpeedWritable" type="number" :max="30000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前速度 (KM/H)">
          </div>
          <div>
            <label for="altitudeInput" class="mb-1 block text-sm text-gray-300 font-medium">当前高度 (KM)</label>
            <input id="altitudeInput" v-model.number="currentAltitudeWritable" type="number" :max="1000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前高度 (KM)">
          </div>
          <!-- 新增的两个参数 -->
          <div>
            <label for="fuelInput" class="mb-1 block text-sm text-gray-300 font-medium">燃料剩余 (%)</label>
            <input id="fuelInput" v-model.number="fuelPercentageWritable" type="number" :min="0" :max="100" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="燃料剩余百分比">
          </div>
          <div>
            <label for="gForceInput" class="mb-1 block text-sm text-gray-300 font-medium">G-Force</label>
            <input id="gForceInput" v-model.number="gForceWritable" type="number" :step="0.1" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="G-Force">
          </div>
        </div>

        <div class="my-4 border-t border-gray-600" />

        <h2 class="mb-2 text-lg font-semibold">
          页面背景图
        </h2>
        <div class="flex space-x-2">
          <button @click="openBackgroundFileDialog()">
            选择本地图片
          </button>
          <button @click="emit('restoreBackgroundImage')">
            还原背景
          </button>
        </div>
        <small v-if="currentBackgroundFile" class="mt-1 block text-xs text-gray-400">
          当前预览: {{ currentBackgroundFile.name }} (本地文件不会被保存)
        </small>
        <small v-else-if="backgroundImageUrl?.startsWith('blob:')" class="mt-1 block text-xs text-gray-400">
          当前为本地预览背景 (不会被保存)
        </small>

        <div class="absolute bottom-4 right-4 z-50 text-right text-xs text-gray-400/75 font-sans">
          <p>作者: 爱吃包子的超</p>
          <p>
            B站主页:
            <a href="https://space.bilibili.com/8487409" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-200">B站主页</a>
          </p>
        </div>
      </div>
    </div>

    <!-- [新增] 事件管理模态框 -->
    <Teleport to="body">
      <div v-if="showEventsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="showEventsModal = false">
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
          <button type="button" class="btn-action mt-4 w-full bg-gray-600 hover:bg-gray-700" @click="showEventsModal = false">
            关闭
          </button>
        </div>
      </div>
    </Teleport>

    <!-- [新增] 显示文本配置模态框 -->
    <Teleport to="body">
      <div v-if="showDisplayInfoModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" @click.self="showDisplayInfoModal = false">
        <div class="exclude-from-screenshot m-4 max-w-md w-full border border-gray-700 rounded-lg bg-gray-800 p-6 text-white shadow-xl">
          <h2 class="mb-4 text-xl font-semibold">
            配置右下角显示文本
          </h2>
          <div class="space-y-3">
            <div>
              <label for="displayInfoTitleInput" class="mb-1 block text-sm text-gray-300 font-medium">标题</label>
              <input id="displayInfoTitleInput" v-model="displayInfoWritable.title" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本标题">
            </div>
            <div>
              <label for="displayInfoLine1Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 1</label>
              <input id="displayInfoLine1Input" v-model="displayInfoWritable.line1" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 1">
            </div>
            <div>
              <label for="displayInfoLine2Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 2</label>
              <input id="displayInfoLine2Input" v-model="displayInfoWritable.line2" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 2">
            </div>
            <div>
              <label for="displayInfoLine3Input" class="mb-1 block text-sm text-gray-300 font-medium">描述行 3</label>
              <input id="displayInfoLine3Input" v-model="displayInfoWritable.line3" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="显示文本描述行 3">
            </div>
          </div>
          <button type="button" class="btn-action mt-6 w-full bg-gray-600 hover:bg-gray-700" @click="showDisplayInfoModal = false">
            关闭
          </button>
        </div>
      </div>
    </Teleport>
  </div>
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
