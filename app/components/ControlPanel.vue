<!-- app/components/ControlPanel.vue -->
<script setup lang="ts">
import type { DisplayInfo } from '~/types'
import DisplayInfoModal from './modal/DisplayInfoModal.vue'
import EventsModal from './modal/EventsModal.vue'

// 定义那些不是由 v-model 控制的 props
const props = defineProps<{
  backgroundImageUrl: string | null
  isStarted: boolean
  isPaused: boolean
  initialCountdownOffset: number
  currentTimeOffset: number
}>()
// 定义那些不是由 v-model update 事件触发的 emits
const emit = defineEmits([
  'addNode',
  'deleteNode',
  'toggleLaunch',
  'resetTimer',
  'jumpToTime',
  'restoreBackgroundImage',
  'openBackgroundDialog',
])
// --- 使用 defineModel ---
// defineModel 会自动注册 prop 和对应的 update 事件，极大地简化了代码
const missionName = defineModel<string>('missionName', { required: true })
const vehicleName = defineModel<string>('vehicleName', { required: true })
const timestamps = defineModel<number[]>('timestamps', { required: true })
const nodeNames = defineModel<string[]>('nodeNames', { required: true })
const displayInfo = defineModel<DisplayInfo>('displayInfo', { required: true })
const currentSpeed = defineModel<number>('currentSpeed', { required: true })
const currentAltitude = defineModel<number>('currentAltitude', { required: true })
const fuelPercentage = defineModel<number>('fuelPercentage', { required: true })
const gForce = defineModel<number>('gForce', { required: true })
const missionTimeRaw = defineModel<number>('missionTimeRaw', { required: true })
const timeValueRaw = defineModel<number>('timeValueRaw', { required: true })
const jumpTargetTimeRaw = defineModel<string | number>('jumpTargetTimeRaw', { required: true })
const showLeftGauges = defineModel<boolean>('showLeftGauges', { required: true })

// 模态框的显示状态
const showEventsModal = ref(false)
const showDisplayInfoModal = ref(false)

// 其他逻辑
const controlButtonText = computed(() => {
  if (!props.isStarted)
    return '开始倒计时'
  if (props.isPaused)
    return '继续'
  return '暂停'
})

const { files: selectedBackgroundFiles, open: openBackgroundFileDialog } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})
const currentBackgroundFile = computed(() => selectedBackgroundFiles.value?.[0] || null)

watch(currentBackgroundFile, () => {
  emit('openBackgroundDialog', currentBackgroundFile.value)
})
</script>

<template>
  <div>
    <!-- 模板中的 v-model 直接绑定 defineModel 返回的 ref -->
    <div class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
      <!-- 卡片 1 -->
      <div class="exclude-from-screenshot max-w-full flex flex-col border border-gray-200 rounded-lg bg-black/50 p-6 space-y-4 dark:border-gray-700">
        <h2 class="text-lg font-semibold">
          主要配置
        </h2>
        <div>
          <label for="missionNameInput" class="mb-1 block text-sm text-gray-300 font-medium">任务名称</label>
          <input id="missionNameInput" v-model="missionName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="任务名称">
        </div>
        <div>
          <label for="vehicleNameInput" class="mb-1 block text-sm text-gray-300 font-medium">运载工具</label>
          <input id="vehicleNameInput" v-model="vehicleName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="运载工具名称">
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

      <!-- 卡片 2 -->
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
          <input
            v-model="jumpTargetTimeRaw"
            placeholder="例如: -12" type="number" class="input-field flex-grow" @keyup.enter="emit('jumpToTime')"
          >
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
          v-model="timeValueRaw"
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

      <!-- 卡片 3 -->
      <div class="exclude-from-screenshot relative max-w-full border border-gray-200 rounded-lg bg-black/50 p-6 dark:border-gray-700">
        <h2 class="mb-2 text-lg font-semibold">
          飞行数据与页面配置
        </h2>
        <div class="space-y-3">
          <div class="border border-gray-700 rounded-md p-3">
            <div class="flex items-center justify-between">
              <label for="showLeftGaugesSwitch" class="text-sm text-gray-300 font-medium">显示左侧仪表盘</label>
              <label for="showLeftGaugesSwitch" class="relative inline-flex cursor-pointer items-center">
                <input id="showLeftGaugesSwitch" v-model="showLeftGauges" type="checkbox" class="peer sr-only">
                <div class="h-6 w-11 rounded-full bg-gray-600 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-gray-300 dark:border-gray-500 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div v-if="showLeftGauges" class="mt-3 border-t border-gray-700 pt-3 space-y-3">
              <div>
                <label for="speedInput" class="mb-1 block text-sm text-gray-300 font-medium">当前速度 (KM/H)</label>
                <input id="speedInput" v-model.number="currentSpeed" type="number" :max="30000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前速度 (KM/H)">
              </div>
              <div>
                <label for="altitudeInput" class="mb-1 block text-sm text-gray-300 font-medium">当前高度 (KM)</label>
                <input id="altitudeInput" v-model.number="currentAltitude" type="number" :max="1000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前高度 (KM)">
              </div>
            </div>
          </div>
          <div>
            <label for="fuelInput" class="mb-1 block text-sm text-gray-300 font-medium">燃料剩余 (%)</label>
            <input id="fuelInput" v-model.number="fuelPercentage" type="number" :min="0" :max="100" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="燃料剩余百分比">
          </div>
          <div>
            <label for="gForceInput" class="mb-1 block text-sm text-gray-300 font-medium">G-Force</label>
            <input id="gForceInput" v-model.number="gForce" type="number" :step="0.1" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="G-Force">
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

    <EventsModal
      v-model:timestamps="timestamps"
      v-model:node-names="nodeNames"
      :show="showEventsModal"
      @close="showEventsModal = false"
      @add-node="emit('addNode')"
      @delete-node="(index) => emit('deleteNode', index)"
    />

    <DisplayInfoModal
      v-model:display-info="displayInfo"
      :show="showDisplayInfoModal"
      @close="showDisplayInfoModal = false"
    />
  </div>
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
</style>
