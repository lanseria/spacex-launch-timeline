<!-- app/pages/index.vue -->
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTimelineStore } from '~/stores/timeline'

const timelineStore = useTimelineStore()

// [修改] 使用 storeToRefs 来解构，以保持状态的响应性
const {
  timelineVersion,
  vehicleName,
  missionName,
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
} = storeToRefs(timelineStore)

const showPanel = ref(true) // showPanel 仍然可以是页面级局部状态
const panelRef = ref(null)

// [修改] 在组件卸载时调用 store 的清理函数
onUnmounted(() => {
  timelineStore.cleanup()
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

      <ControlPanel
        v-if="showPanel"
        ref="panelRef"
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

      <!-- 下面这些组件的 props 绑定保持不变，因为它们的数据现在来自 storeToRefs -->
      <Falcon9TimelineSvgV1
        v-if="timelineVersion === 'Falcon9V1'"
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
      />
      <Falcon9TimelineSvgV2
        v-else-if="timelineVersion === 'Falcon9V2'"
        class="fixed bottom-0 left-1/2 z-30 -translate-x-1/2"
        :timestamps="processedTimestamps"
        :node-names="nodeNames"
        :mission-duration="missionTimeSeconds"
        :current-time-offset="currentTimeOffset"
      />

      <template v-if="showLeftGauges">
        <TrapezoidGradient class="absolute bottom-40px left-0 z-1" />
        <div class="absolute bottom-10px left-60px z-30 flex gap-4">
          <template v-if="timelineVersion === 'Falcon9V1'">
            <Falcon9GaugeV1
              label="SPEED"
              unit="KM/H"
              :value="currentSpeed"
              :max-value="30000"
            />
            <Falcon9GaugeV1
              label="ALTITUDE"
              unit="KM"
              :value="currentAltitude"
              :max-value="700"
              :fraction-digits="1"
            />
          </template>
          <template v-else-if="timelineVersion === 'Falcon9V2'">
            <Falcon9GaugeV2
              label="SPEED"
              unit="KM/H"
              :value="currentSpeed"
              :max-value="30000"
            />
            <Falcon9GaugeV2
              label="ALTITUDE"
              unit="KM"
              :value="currentAltitude"
              :max-value="700"
              :fraction-digits="1"
            />
          </template>
        </div>
      </template>

      <template v-if="showRightPanel">
        <TrapezoidGradient class="absolute bottom-40px right-0 z-1" horizontal-flip />
        <div v-if="rightPanelMode === 'displayInfo'" class="absolute bottom-0 right-0 z-1 h-180px w-550px flex flex-col justify-center pr-40px text-right font-saira">
          <div class="text-30px font-600">
            {{ displayInfo.title }}
          </div>
          <div>{{ displayInfo.line1 }}</div>
          <div>{{ displayInfo.line2 }}</div>
          <div>{{ displayInfo.line3 }}</div>
        </div>
        <div v-if="rightPanelMode === 'gauges'" class="absolute bottom-10px right-60px z-30 flex flex-row-reverse gap-4">
          <template v-if="timelineVersion === 'Falcon9V1'">
            <Falcon9GaugeV1
              label="G-FORCE"
              unit="G"
              :value="gForce"
              :max-value="8"
              :fraction-digits="1"
            />
            <Falcon9GaugeV1
              label="FUEL"
              unit="%"
              :value="fuelPercentage"
              :max-value="100"
            />
          </template>
          <template v-else-if="timelineVersion === 'Falcon9V2'">
            <Falcon9GaugeV2
              label="G-FORCE"
              unit="G"
              :value="gForce"
              :max-value="8"
              :fraction-digits="1"
            />
            <Falcon9GaugeV2
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
