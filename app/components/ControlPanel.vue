<!-- app/components/ControlPanel.vue -->
<script setup lang="ts">
import { useTimelineStore } from '~/stores/timeline'
import DisplayInfoModal from './modal/DisplayInfoModal.vue'
import EventsModal from './modal/EventsModal.vue'

const timelineStore = useTimelineStore()


// 模态框的显示状态 (保持为组件内部状态)
const showEventsModal = ref(false)
const showDisplayInfoModal = ref(false)

// 控制按钮的计算属性直接使用 store 的状态
const controlButtonText = computed(() => {
  if (!timelineStore.isStarted)
    return '开始倒计时'
  if (timelineStore.isPaused)
    return '继续'
  return '暂停'
})

// 文件对话框逻辑直接与 store 交互
const { files: selectedBackgroundFiles, open: openBackgroundFileDialog } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})
const currentBackgroundFile = computed(() => selectedBackgroundFiles.value?.[0] || null)

// 监听到文件变化后，创建 Object URL 并更新 store
watch(currentBackgroundFile, (file) => {
  if (timelineStore.backgroundImageUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(timelineStore.backgroundImageUrl)
  }
  if (file) {
    timelineStore.backgroundImageUrl = URL.createObjectURL(file)
  }
})
</script>

<template>
  <div>
    <!-- 模板中的 v-model 和事件绑定全部指向 timelineStore -->
    <div class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
      <!-- 卡片 1 -->
      <div class="exclude-from-screenshot max-w-full flex flex-col border border-gray-200 rounded-lg bg-black/50 p-6 space-y-4 dark:border-gray-700">
        <h2 class="text-lg font-semibold">
          主要配置
        </h2>
        <div>
          <label class="mb-2 block text-sm text-gray-300 font-medium">UI 版本</label>
          <fieldset class="grid grid-cols-2 gap-2 rounded-lg bg-gray-700/50 p-1">
            <legend class="sr-only">
              UI Version
            </legend>
            <div>
              <input id="version-v1" v-model="timelineStore.timelineVersion" type="radio" value="Falcon9V1" class="peer sr-only">
              <label for="version-v1" class="block cursor-pointer rounded-md py-1.5 text-center text-sm text-gray-400 font-medium transition-colors duration-150 peer-checked:bg-gray-600 peer-checked:text-white">
                V1
              </label>
            </div>
            <div>
              <input id="version-v2" v-model="timelineStore.timelineVersion" type="radio" value="Falcon9V2" class="peer sr-only">
              <label for="version-v2" class="block cursor-pointer rounded-md py-1.5 text-center text-sm text-gray-400 font-medium transition-colors duration-150 peer-checked:bg-gray-600 peer-checked:text-white">
                V2 (推荐)
              </label>
            </div>
          </fieldset>
        </div>
        <div>
          <label for="missionNameInput" class="mb-1 block text-sm text-gray-300 font-medium">任务名称</label>
          <input id="missionNameInput" v-model="timelineStore.missionName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="任务名称">
        </div>
        <div>
          <label for="vehicleNameInput" class="mb-1 block text-sm text-gray-300 font-medium">运载工具</label>
          <input id="vehicleNameInput" v-model="timelineStore.vehicleName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="运载工具名称">
        </div>
        <div class="my-2 border-t border-gray-600" />
        <div class="space-y-3">
          <button class="btn-action w-full bg-indigo-600 hover:bg-indigo-700" @click="showEventsModal = true">
            管理事件节点
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
            'bg-blue-500 hover:bg-blue-600': !timelineStore.isStarted,
            'bg-yellow-500 hover:bg-yellow-600': timelineStore.isStarted && !timelineStore.isPaused,
            'bg-green-500 hover:bg-green-600': timelineStore.isStarted && timelineStore.isPaused,
          }"
          @click="timelineStore.toggleLaunch()"
        >
          {{ controlButtonText }}
        </button>
        <button
          class="btn-action mt-2 w-full bg-red-500 hover:bg-red-600"
          :disabled="!timelineStore.isStarted && timelineStore.currentTimeOffset === timelineStore.initialCountdownOffset"
          aria-label="重置计时器"
          @click="timelineStore.resetTimer()"
        >
          重置计时器
        </button>
        <h2 class="mb-2 mt-2 text-lg font-semibold">
          快速跳转 (秒)
        </h2>
        <div class="flex items-center space-x-2">
          <input
            v-model="timelineStore.jumpTargetTimeRaw"
            placeholder="例如: -12" type="number" class="input-field flex-grow" @keyup.enter="timelineStore.jumpToTime()"
          >
          <button
            class="btn-action bg-indigo-500 hover:bg-indigo-600"
            aria-label="跳转到指定时间"
            @click="timelineStore.jumpToTime()"
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
          v-model="timelineStore.timeValueRaw"
          type="number"
          placeholder="例如: 60"
          class="input-field w-full dark:bg-gray-700 dark:text-white"
          aria-label="发射倒计时秒数 (正数)"
          :disabled="timelineStore.isStarted"
        >
        <small class="mb-4 block text-xs text-gray-500 dark:text-gray-400">
          从T减多少秒开始倒计时。例如60代表 T-60秒。
        </small>
        <h2 class="mb-2 text-lg font-semibold">
          时间轴总时长 (秒)
        </h2>
        <input
          v-model.number="timelineStore.missionTimeRaw"
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
          <!-- 左侧仪表盘控制 -->
          <div class="border border-gray-700 rounded-md p-3">
            <div class="flex items-center justify-between">
              <label for="showLeftGaugesSwitch" class="text-sm text-gray-300 font-medium">显示左侧仪表盘</label>
              <label for="showLeftGaugesSwitch" class="relative inline-flex cursor-pointer items-center">
                <input id="showLeftGaugesSwitch" v-model="timelineStore.showLeftGauges" type="checkbox" class="peer sr-only">
                <div class="h-6 w-11 rounded-full bg-gray-600 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-gray-300 dark:border-gray-500 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div v-if="timelineStore.showLeftGauges" class="mt-3 border-t border-gray-700 pt-3 space-y-3">
              <div>
                <label for="speedInput" class="mb-1 block text-sm text-gray-300 font-medium">当前速度 (KM/H)</label>
                <input id="speedInput" v-model.number="timelineStore.currentSpeed" type="number" :max="30000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前速度 (KM/H)">
              </div>
              <div>
                <label for="altitudeInput" class="mb-1 block text-sm text-gray-300 font-medium">当前高度 (KM)</label>
                <input id="altitudeInput" v-model.number="timelineStore.currentAltitude" type="number" :max="1000" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="当前高度 (KM)">
              </div>
            </div>
          </div>

          <!-- 右侧面板控制 -->
          <div class="border border-gray-700 rounded-md p-3">
            <div class="flex items-center justify-between">
              <label for="showRightPanelSwitch" class="text-sm text-gray-300 font-medium">显示右侧面板</label>
              <label for="showRightPanelSwitch" class="relative inline-flex cursor-pointer items-center">
                <input id="showRightPanelSwitch" v-model="timelineStore.showRightPanel" type="checkbox" class="peer sr-only">
                <div class="h-6 w-11 rounded-full bg-gray-600 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:border after:border-gray-300 dark:border-gray-500 after:rounded-full after:bg-white dark:bg-gray-700 peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
              </label>
            </div>
            <div v-if="timelineStore.showRightPanel" class="mt-3 border-t border-gray-700 pt-3 space-y-3">
              <fieldset>
                <legend class="mb-2 text-sm text-gray-300 font-medium">
                  右侧面板模式
                </legend>
                <div class="flex items-center gap-4">
                  <div class="flex items-center">
                    <input id="mode-displayInfo" v-model="timelineStore.rightPanelMode" type="radio" value="displayInfo" name="right-panel-mode" class="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600">
                    <label for="mode-displayInfo" class="ml-2 block text-sm text-gray-300">文本信息</label>
                  </div>
                  <div class="flex items-center">
                    <input id="mode-gauges" v-model="timelineStore.rightPanelMode" type="radio" value="gauges" name="right-panel-mode" class="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600">
                    <label for="mode-gauges" class="ml-2 block text-sm text-gray-300">仪表盘</label>
                  </div>
                </div>
              </fieldset>
              <div v-if="timelineStore.rightPanelMode === 'gauges'">
                <label for="fuelInput" class="mb-1 block text-sm text-gray-300 font-medium">燃料剩余 (%)</label>
                <input id="fuelInput" v-model.number="timelineStore.fuelPercentage" type="number" :min="0" :max="100" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="燃料剩余百分比">
              </div>
              <div v-if="timelineStore.rightPanelMode === 'gauges'">
                <label for="gForceInput" class="mb-1 block text-sm text-gray-300 font-medium">G-Force</label>
                <input id="gForceInput" v-model.number="timelineStore.gForce" type="number" :step="0.1" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="G-Force">
              </div>
              <button v-if="timelineStore.rightPanelMode === 'displayInfo'" class="btn-action w-full bg-purple-600 hover:bg-purple-700" @click="showDisplayInfoModal = true">
                配置右下角文本
              </button>
            </div>
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
          <button @click="timelineStore.restoreBackgroundImage()">
            还原背景
          </button>
        </div>
        <small v-if="currentBackgroundFile" class="mt-1 block text-xs text-gray-400">
          当前预览: {{ currentBackgroundFile.name }} (本地文件不会被保存)
        </small>
        <small v-else-if="timelineStore.backgroundImageUrl?.startsWith('blob:')" class="mt-1 block text-xs text-gray-400">
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

    <!-- 模态框也直接与 store 交互 -->
    <EventsModal
      v-model:timestamps="timelineStore.timestamps"
      v-model:node-names="timelineStore.nodeNames"
      :show="showEventsModal"
      @close="showEventsModal = false"
      @add-node="timelineStore.addNode()"
      @delete-node="timelineStore.deleteNode"
    />

    <DisplayInfoModal
      v-model:display-info="timelineStore.displayInfo"
      :show="showDisplayInfoModal"
      @close="showDisplayInfoModal = false"
    />
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
</style>