<script setup lang="ts">
// pages/index.vue
// import { type AltitudePoint, type SpeedPoint } from '~/composables/useSpaceTimeline' // 类型现在在子组件或 composable 中处理

// 从 useSpaceTimeline 获取核心状态和方法
const {
  missionName, // 仍然在 index.vue 中用于底部显示
  vehicleName, // 仍然在 index.vue 中用于顶部显示
  showPanel,
  timerClock, // 仍然在 index.vue 中用于底部显示
  processedTimestamps, // 用于 TimelineSvg
  nodeNames, // 用于 TimelineSvg
  missionTimeSeconds, // 用于 TimelineSvg
  currentTimeOffset, // 用于 TimelineSvg
  currentSpeed, // 用于 Gauge
  currentAltitude, // 用于 Gauge
  // 下面的这些将由子组件或 Modal 的 emit 触发，并在 index.vue 中调用
  // loadAltitudeProfile, clearAltitudeProfile, loadSpeedProfile, clearSpeedProfile
  // altitudeProfile 和 speedProfile 会被传递给 Modal 作为 prop
  altitudeProfile,
  speedProfile,
  maxQTitle,
  maxQLine1,
  maxQLine2,
  maxQLine3,
} = useSpaceTimeline()

const panelRef = useTemplateRef<HTMLElement>('panelRef')
// Modal 的 ref 现在在 Modal 组件内部，但我们需要 Modal 的状态
const showAltitudeModal = ref(false)
const altitudeFileError = ref<string | null>(null)
const showSpeedModal = ref(false)
const speedFileError = ref<string | null>(null)

// 文件对话框逻辑 (保持在 index.vue 因为它们触发 composable 中的方法)
// 高度
const { files: selectedAltitudeFiles, open: openAltitudeFileDialog, reset: resetAltitudeFileDialog } = useFileDialog({
  accept: '.json',
  multiple: false,
})
watch(selectedAltitudeFiles, async (newFiles) => {
  const file = newFiles?.[0]
  if (file) {
    altitudeFileError.value = null
    try {
      // 调用从 useSpaceTimeline 获取的 loadAltitudeProfile
      const { loadAltitudeProfile: loadAlt } = useSpaceTimeline()
      await loadAlt(file)
    }
    catch (error: any) { altitudeFileError.value = error.message || '加载或解析高度数据文件失败。' }
    finally { resetAltitudeFileDialog() }
  }
})
// 速度
const { files: selectedSpeedFiles, open: openSpeedFileDialog, reset: resetSpeedFileDialog } = useFileDialog({
  accept: '.json',
  multiple: false,
})
watch(selectedSpeedFiles, async (newFiles) => {
  const file = newFiles?.[0]
  if (file) {
    speedFileError.value = null
    try {
      const { loadSpeedProfile: loadSpd } = useSpaceTimeline()
      await loadSpd(file)
    }
    catch (error: any) { speedFileError.value = error.message || '加载或解析速度数据文件失败。' }
    finally { resetSpeedFileDialog() }
  }
})

// --- Modal 事件处理 ---
// 高度 Modal
function handleOpenAltitudeModal() { showAltitudeModal.value = true }
function handleCloseAltitudeModal() {
  showAltitudeModal.value = false
  altitudeFileError.value = null
}
function handleImportAltitudeRequest() { // Modal 发出请求
  altitudeFileError.value = null
  openAltitudeFileDialog()
}
async function handleLoadSampleAltitudeRequest() { // Modal 发出请求
  altitudeFileError.value = null
  try {
    const { altitudeProfile: altProfileRef } = useSpaceTimeline() // 获取响应式引用
    const response = await fetch('/assets/data/falcon9_altitude_profile.json')
    if (!response.ok)
      throw new Error(`无法加载示例数据: ${response.statusText}`)
    const sampleData = await response.json()
    if (Array.isArray(sampleData) && sampleData.every(p => typeof p.time === 'number' && typeof p.altitude === 'number')) {
      altProfileRef.value = sampleData // 直接更新 composable 中的 ref
    }
    else { throw new Error('示例高度数据格式无效。') }
  }
  catch (error: any) { altitudeFileError.value = error.message || '加载 Falcon 9 示例高度数据失败。' }
}
function handleClearAltitudeRequest() { // Modal 发出请求
  const { clearAltitudeProfile: clearAlt } = useSpaceTimeline()
  clearAlt()
  altitudeFileError.value = null
}

// 速度 Modal
function handleOpenSpeedModal() { showSpeedModal.value = true }
function handleCloseSpeedModal() {
  showSpeedModal.value = false
  speedFileError.value = null
}
function handleImportSpeedRequest() {
  speedFileError.value = null
  openSpeedFileDialog()
}
async function handleLoadSampleSpeedRequest() {
  speedFileError.value = null
  try {
    const { speedProfile: spdProfileRef } = useSpaceTimeline()
    const response = await fetch('/assets/data/falcon9_speed_profile.json')
    if (!response.ok)
      throw new Error(`无法加载示例数据: ${response.statusText}`)
    const sampleData = await response.json()
    if (Array.isArray(sampleData) && sampleData.every(p => typeof p.time === 'number' && typeof p.speed === 'number')) {
      spdProfileRef.value = sampleData
    }
    else { throw new Error('示例速度数据格式无效。') }
  }
  catch (error: any) { speedFileError.value = error.message || '加载 Falcon 9 示例速度数据失败。' }
}
function handleClearSpeedRequest() {
  const { clearSpeedProfile: clearSpd } = useSpaceTimeline()
  clearSpd()
  speedFileError.value = null
}

onUnmounted(() => {
  resetAltitudeFileDialog()
  resetSpeedFileDialog()
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

      <!-- 控制面板容器 -->
      <div v-show="showPanel" ref="panelRef" class="relative z-20 grid grid-cols-3 mx-auto my-8 w-1200px justify-center gap-4">
        <PanelCardEventsMaxQ />
        <PanelCardControlsTimeline />
        <PanelCardMissionData
          @open-altitude-modal="handleOpenAltitudeModal"
          @open-speed-modal="handleOpenSpeedModal"
        />
      </div>

      <!-- 底部计时器 -->
      <div class="fixed bottom-16px left-1/2 z-50 mx-auto max-w-md text-center font-400 font-saira -translate-x-1/2">
        <div class="text-42px text-white leading-tight tabular-nums">
          {{ timerClock }}
        </div>
        <div class="text-sm text-gray-400 uppercase">
          {{ missionName }}
        </div>
      </div>

      <!-- SVG 时间线 -->
      <TimelineSvg
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
        :svg-width="1920"
        :svg-height="200"
        :past-node-density-factor="3"
        :future-node-density-factor="1"
        @click="showPanel = !showPanel"
      />
      <!-- 左侧 Gauge -->
      <TrapezoidGradient class="absolute bottom-0 left-0 z-1" />
      <div class="absolute bottom-10px left-60px z-30 flex gap-4">
        <Gauge
          label="SPEED"
          unit="KM/H"
          :value="currentSpeed"
          :max-value="30000"
          :fraction-digits="0"
        />
        <Gauge
          label="ALTITUDE"
          unit="KM"
          :value="currentAltitude"
          :max-value="700"
          :fraction-digits="1"
        />
      </div>

      <!-- 右侧 MAX-Q 显示 (从 useSpaceTimeline 获取数据) -->
      <TrapezoidGradient class="absolute bottom-0 right-0 z-1" horizontal-flip />
      <!-- <RightPanelMaxQInfo /> -->
      <!-- 假设你也将这部分拆分，或者直接使用下面的HTML -->

      <div class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira">
        <div class="text-30px font-600">
          {{ maxQTitle }}
        </div>
        <div>{{ maxQLine1 }}</div>
        <div>{{ maxQLine2 }}</div>
        <div>{{ maxQLine3 }}</div>
      </div>
    </div>

    <AltitudeConfigModal
      :show-modal="showAltitudeModal"
      :altitude-profile="altitudeProfile"
      :error="altitudeFileError"
      @close="handleCloseAltitudeModal"
      @import-data="handleImportAltitudeRequest"
      @load-sample-data="handleLoadSampleAltitudeRequest"
      @clear-data="handleClearAltitudeRequest"
    />

    <SpeedConfigModal
      :show-modal="showSpeedModal"
      :speed-profile="speedProfile"
      :error="speedFileError"
      @close="handleCloseSpeedModal"
      @import-data="handleImportSpeedRequest"
      @load-sample-data="handleLoadSampleSpeedRequest"
      @clear-data="handleClearSpeedRequest"
    />
  </LayoutAdapter>
</template>
