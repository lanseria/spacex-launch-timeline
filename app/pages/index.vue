<!-- app/pages/index.vue -->
<script setup lang="ts">
// index.vue 现在只需要它直接渲染或控制的 state
const {
  vehicleName,
  missionName,
  showPanel,
  timerClock,
  displayInfo,
  nodeNames,
  processedTimestamps,
  missionTimeSeconds,
  currentTimeOffset,
  currentSpeed,
  currentAltitude,
} = useSpaceTimeline()

// panelRef 用于 onClickOutside，指向新组件的根元素
const panelRef = ref(null)
onClickOutside(panelRef, () => {
  if (showPanel.value)
    showPanel.value = false
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

      <!-- [修改] 使用新的 ControlPanel 组件 -->
      <ControlPanel v-show="showPanel" ref="panelRef" />

      <div
        class="fixed inset-0 z-0"
        aria-hidden="true"
        @click="() => { showPanel = !showPanel }"
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
      </div>

      <TrapezoidGradient class="absolute bottom-40px right-0 z-1" horizontal-flip />
      <div class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira">
        <div class="text-30px font-600">
          {{ displayInfo.title }}
        </div>
        <div>{{ displayInfo.line1 }}</div>
        <div>{{ displayInfo.line2 }}</div>
        <div>{{ displayInfo.line3 }}</div>
      </div>
      <GradientBar class="absolute bottom-0 left-0 z-1" />
    </div>
  </LayoutAdapter>
</template>

<style scoped>
/* [删除] 这里的所有样式都已移动到 ControlPanel.vue */
</style>
