<script setup lang="ts">
const emit = defineEmits<{
  (e: 'openAltitudeModal'): void
  (e: 'openSpeedModal'): void
  (e: 'openBackgroundFileDialog'): void // 新增，用于触发背景图片选择
}>()

const {
  missionName,
  vehicleName,
  manualSpeed, // 使用 manualSpeed
  speedProfile,
  manualAltitude,
  altitudeProfile,
  backgroundImageUrl, // 这个从 useSpaceTimeline 获取
  restoreBackgroundImage, // 这个也从 useSpaceTimeline 获取
} = useSpaceTimeline()

// 背景图片相关逻辑，如果选择在父组件处理文件对话框，这里只需要 emit
// 如果选择在此组件处理，则需要复制 useFileDialog 逻辑
// 为简化，我们让父组件处理 useFileDialog for background
const { files: selectedBackgroundFiles, open: openBackgroundFileDialogInternal } = useFileDialog({
  accept: 'image/*',
  multiple: false,
})
const currentBackgroundFile = computed(() => selectedBackgroundFiles.value?.[0] || null)
const localBackgroundFileObjectUrl = useObjectUrl(currentBackgroundFile) // 这个仍然在此处，用于预览

// 监视本地对象URL，并更新 backgroundImageUrl
// 注意：backgroundImageUrl 是 useSpaceTimeline 中的持久化 ref
watch(localBackgroundFileObjectUrl, (newObjectUrl) => {
  if (newObjectUrl) {
    if (backgroundImageUrl.value?.startsWith('blob:') && backgroundImageUrl.value !== newObjectUrl) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
    backgroundImageUrl.value = newObjectUrl // 直接修改 composable 中的 ref
    triggerRef(backgroundImageUrl) // 确保更新被侦测
  }
})

function handleSelectBackgroundImage() {
  openBackgroundFileDialogInternal() // 打开此组件内的文件对话框
}

function handleRestoreStoredBackgroundImage() {
  if (backgroundImageUrl.value?.startsWith('blob:')) {
    // 如果当前是blob，意味着是本地预览，需要清除
    if (selectedBackgroundFiles.value?.length) {
      selectedBackgroundFiles.value = null // 清除 useFileDialog 的文件
    }
  }
  restoreBackgroundImage() // 调用 composable 中的函数恢复默认/持久化值
}

onUnmounted(() => {
  if (selectedBackgroundFiles.value?.length) {
    selectedBackgroundFiles.value = null
  }
})
</script>

<template>
  <div class="exclude-from-screenshot relative max-w-full border border-gray-200 rounded-lg bg-black/50 p-6 dark:border-gray-700">
    <h2 class="mb-2 text-lg font-semibold">
      任务与飞行数据配置
    </h2>
    <div class="space-y-3">
      <div>
        <label for="missionNameInputCard3" class="mb-1 block text-sm text-gray-300 font-medium">任务名称</label>
        <input id="missionNameInputCard3" v-model="missionName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="任务名称">
      </div>
      <div>
        <label for="vehicleNameInputCard3" class="mb-1 block text-sm text-gray-300 font-medium">运载工具</label>
        <input id="vehicleNameInputCard3" v-model="vehicleName" type="text" class="input-field w-full dark:bg-gray-700 dark:text-white" aria-label="运载工具名称">
      </div>
      <div>
        <label for="speedInputCard3" class="mb-1 block text-sm text-gray-300 font-medium">当前速度 (KM/H)</label>
        <div class="flex items-center space-x-2">
          <input
            id="speedInputCard3"
            v-model.number="manualSpeed"
            type="number"
            :max="30000"
            class="input-field flex-grow dark:bg-gray-700 dark:text-white"
            aria-label="当前速度 (KM/H)"
            :disabled="speedProfile && speedProfile.length > 0"
          >
          <button
            type="button"
            class="btn-action h-9 w-9 flex-shrink-0 bg-cyan-600 p-2 hover:bg-cyan-700"
            aria-label="配置速度曲线数据"
            @click="emit('openSpeedModal')"
          >
            <div class="i-carbon-settings-adjust" />
          </button>
        </div>
        <small v-if="speedProfile && speedProfile.length > 0" class="mt-1 block text-xs text-yellow-400">
          速度由导入的曲线数据控制。
        </small>
      </div>
      <div>
        <label for="altitudeInputCard3" class="mb-1 block text-sm text-gray-300 font-medium">当前高度 (KM)</label>
        <div class="flex items-center space-x-2">
          <input
            id="altitudeInputCard3"
            v-model.number="manualAltitude"
            type="number"
            :max="1000"
            class="input-field flex-grow dark:bg-gray-700 dark:text-white"
            aria-label="当前高度 (KM)"
            :disabled="altitudeProfile && altitudeProfile.length > 0"
          >
          <button
            type="button"
            class="btn-action h-9 w-9 flex-shrink-0 bg-purple-600 p-2 hover:bg-purple-700"
            aria-label="配置高度曲线数据"
            @click="emit('openAltitudeModal')"
          >
            <div class="i-carbon-settings-adjust" />
          </button>
        </div>
        <small v-if="altitudeProfile && altitudeProfile.length > 0" class="mt-1 block text-xs text-yellow-400">
          高度由导入的曲线数据控制。
        </small>

        <h2 class="mb-2 pt-2 text-lg font-semibold">
          页面背景图
        </h2>
        <div class="flex space-x-2">
          <button
            type="button"
            class="btn-action flex-1 bg-sky-500 hover:bg-sky-600"
            aria-label="选择本地背景图片"
            @click="handleSelectBackgroundImage"
          >
            选择本地图片
          </button>
          <button
            type="button"
            class="btn-action flex-1 bg-orange-500 hover:bg-orange-600"
            aria-label="还原背景图"
            :disabled="(!currentBackgroundFile) && !backgroundImageUrl?.startsWith('blob:')"
            @click="handleRestoreStoredBackgroundImage"
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
    </div>
  </div>
</template>
