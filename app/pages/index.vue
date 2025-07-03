<!-- app/pages/index.vue -->
<script setup lang="ts">
const {
  timelineVersion,
  vehicleName,
  missionName,
  showPanel,
  showLeftGauges,
  showRightPanel,
  rightPanelMode,
  timerClock,
  displayInfo,
  nodeNames,
  processedTimestamps,
  missionTimeSeconds,
  currentTimeOffset,
  currentSpeed,
  currentAltitude,
  fuelPercentage,
  gForce,
  backgroundImageUrl,
  missionTimeRaw,
  timeValueRaw,
  isStarted,
  isPaused,
  initialCountdownOffset,
  jumpTargetTimeRaw,
  addNode,
  deleteNode,
  toggleLaunch,
  resetTimer,
  jumpToTime,
  restoreBackgroundImage,
} = useSpaceTimeline()

const panelRef = ref(null)
const localBackgroundFileObjectUrl = ref<string | null>(null)
function handleBackgroundDialog(file: File | null) {
  if (localBackgroundFileObjectUrl.value) {
    URL.revokeObjectURL(localBackgroundFileObjectUrl.value)
  }
  if (file) {
    const newUrl = URL.createObjectURL(file)
    backgroundImageUrl.value = newUrl
    localBackgroundFileObjectUrl.value = newUrl
  }
}

onUnmounted(() => {
  if (localBackgroundFileObjectUrl.value) {
    URL.revokeObjectURL(localBackgroundFileObjectUrl.value)
  }
})
</script>

<template>
  <LayoutAdapter>
    <div class="fixed left-0 top-0 h-full w-full -z-1">
      <Head>
        <Title>SpaceX 发射时间线 - 主页</Title>
      </Head>

      <div class="relative z-10 mx-auto my-4 text-center" @click="showPanel = !showPanel">
        <p class="text-40px text-white font-500 font-saira">
          {{ vehicleName }}
        </p>
      </div>

      <!-- 使用新的 ControlPanel 组件 -->
      <ControlPanel
        v-if="showPanel"
        ref="panelRef"
        v-model:timeline-version="timelineVersion"
        v-model:mission-name="missionName"
        v-model:vehicle-name="vehicleName"
        v-model:current-speed="currentSpeed"
        v-model:current-altitude="currentAltitude"
        v-model:fuel-percentage="fuelPercentage"
        v-model:g-force="gForce"
        v-model:mission-time-raw="missionTimeRaw"
        v-model:time-value-raw="timeValueRaw"
        v-model:jump-target-time-raw="jumpTargetTimeRaw"
        v-model:timestamps="processedTimestamps"
        v-model:node-names="nodeNames"
        v-model:display-info="displayInfo"
        v-model:show-left-gauges="showLeftGauges"
        v-model:show-right-panel="showRightPanel"
        v-model:right-panel-mode="rightPanelMode"
        :background-image-url="backgroundImageUrl"
        :is-started="isStarted"
        :is-paused="isPaused"
        :initial-countdown-offset="initialCountdownOffset"
        :current-time-offset="currentTimeOffset"
        @add-node="addNode"
        @delete-node="deleteNode"
        @toggle-launch="toggleLaunch"
        @reset-timer="resetTimer"
        @jump-to-time="jumpToTime"
        @restore-background-image="restoreBackgroundImage"
        @open-background-dialog="handleBackgroundDialog"
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

      <Falcon9V1TimelineSvg
        v-if="timelineVersion === 'Falcon9V1'"
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
      />
      <Falcon9V2TimelineSvg
        v-else-if="timelineVersion === 'Falcon9V2'"
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
      />

      <!-- 使用 v-if 控制左侧元素的显示 -->
      <!-- 使用 v-if 控制左侧元素的显示 -->
      <template v-if="showLeftGauges">
        <TrapezoidGradient class="absolute bottom-40px left-0 z-1" />
        <div class="absolute bottom-10px left-60px z-30 flex gap-4">
          <!-- [修改] 根据 timelineVersion 动态渲染左侧 Gauge -->
          <template v-if="timelineVersion === 'Falcon9V1'">
            <Falcon9V1Gauge
              label="SPEED"
              unit="KM/H"
              :value="currentSpeed"
              :max-value="30000"
            />
            <Falcon9V1Gauge
              label="ALTITUDE"
              unit="KM"
              :value="currentAltitude"
              :max-value="700"
              :fraction-digits="1"
            />
          </template>
          <template v-else-if="timelineVersion === 'Falcon9V2'">
            <Falcon9V2Gauge
              label="SPEED"
              unit="KM/H"
              :value="currentSpeed"
              :max-value="30000"
            />
            <Falcon9V2Gauge
              label="ALTITUDE"
              unit="KM"
              :value="currentAltitude"
              :max-value="700"
              :fraction-digits="1"
            />
          </template>
        </div>
      </template>

      <!-- 右侧面板 -->
      <template v-if="showRightPanel">
        <TrapezoidGradient class="absolute bottom-40px right-0 z-1" horizontal-flip />
        <!-- 模式一: 显示文本信息 -->
        <div v-if="rightPanelMode === 'displayInfo'" class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira">
          <div class="text-30px font-600">
            {{ displayInfo.title }}
          </div>
          <div>{{ displayInfo.line1 }}</div>
          <div>{{ displayInfo.line2 }}</div>
          <div>{{ displayInfo.line3 }}</div>
        </div>
        <!-- 模式二: 显示仪表盘 -->
        <div v-if="rightPanelMode === 'gauges'" class="absolute bottom-10px right-60px z-30 flex flex-row-reverse gap-4">
          <!-- [修改] 根据 timelineVersion 动态渲染右侧 Gauge -->
          <template v-if="timelineVersion === 'Falcon9V1'">
            <Falcon9V1Gauge
              label="G-FORCE"
              unit="G"
              :value="gForce"
              :max-value="8"
              :fraction-digits="1"
            />
            <Falcon9V1Gauge
              label="FUEL"
              unit="%"
              :value="fuelPercentage"
              :max-value="100"
            />
          </template>
          <template v-else-if="timelineVersion === 'Falcon9V2'">
            <Falcon9V2Gauge
              label="G-FORCE"
              unit="G"
              :value="gForce"
              :max-value="8"
              :fraction-digits="1"
            />
            <Falcon9V2Gauge
              label="FUEL"
              unit="%"
              :value="fuelPercentage"
              :max-value="100"
            />
          </template>
        </div>
      </template>
      <GradientBar class="absolute bottom-0 left-0 z-1" />
    </div>
  </LayoutAdapter>
</template>
