import type { DisplayInfo } from '~/types'
import { useLocalStorage, useSessionStorage } from '@vueuse/core'
import { defineStore } from 'pinia'

const defaultConfig = {
  missionName: 'Starlink',
  vehicle: 'Falcon 9 Block 5',
  speed: 7501,
  altitude: 64,
  fuelPercentage: 100,
  gForce: 1.0,
  backgroundImageUrl: '/assets/images/falcon9_16_9.jpg',
  events: [
    { time: -300, name: 'ENGINE CHILL' },
    { time: -65, name: 'STRONGBACK RETRACT' },
    { time: -10, name: 'STARTUP' },
    { time: 0, name: 'LIFTOFF' },
    { time: 72, name: 'MAX-Q' },
    { time: 145, name: 'STAGE SEP' },
    { time: 195, name: 'FAIRING' },
    { time: 380, name: 'ENTRY BURN' },
    { time: 490, name: 'LANDING BURN' },
    { time: 530, name: 'SECO-1' },
  ],
  displayInfo: {
    title: 'LIFTOFF',
    line1: 'FALCON 9 HAS CLEARED THE TOWER',
    line2: '',
    line3: '',
  },
}

function parseSeconds(timeValue: string | number): number {
  if (typeof timeValue === 'number')
    return Math.round(timeValue)
  const num = Number.parseInt(timeValue, 10)
  return Number.isNaN(num) ? 0 : num
}

export const useTimelineStore = defineStore('timeline', () => {
  // --- 1. State (状态) ---
  const initialEventTimes = defaultConfig.events.map(event => event.time)
  const initialEventNames = defaultConfig.events.map(event => event.name)
  const minEventTime = Math.min(...initialEventTimes, 0)
  const maxEventTime = Math.max(...initialEventTimes, 0)
  const defaultMissionDurationSeconds = (maxEventTime - minEventTime) > 0
    ? Math.ceil((maxEventTime - minEventTime) / 600) * 600 + 600
    : 3600
  const firstNegativeEventTime = initialEventTimes.find(t => t < 0)
  const defaultCountdownStartSeconds = firstNegativeEventTime ? Math.abs(firstNegativeEventTime) : 60

  const timelineVersion = useLocalStorage<'Falcon9V1' | 'Falcon9V2'>('spacex_timeline_version', 'Falcon9V2')
  const missionName = useLocalStorage<string>('spacex_mission_name', defaultConfig.missionName)
  const vehicleName = useLocalStorage<string>('spacex_vehicle_name', defaultConfig.vehicle)
  const currentSpeed = useLocalStorage<number>('spacex_telemetry_speed', defaultConfig.speed)
  const currentAltitude = useLocalStorage<number>('spacex_altitude_km', defaultConfig.altitude)
  const fuelPercentage = useLocalStorage<number>('spacex_fuel_percentage', defaultConfig.fuelPercentage)
  const gForce = useLocalStorage<number>('spacex_g_force', defaultConfig.gForce)
  const displayInfo = useLocalStorage<DisplayInfo>('spacex_display_info', defaultConfig.displayInfo)
  const backgroundImageUrl = useSessionStorage<string>('spacex_persisted_background_image_url', defaultConfig.backgroundImageUrl)

  const showLeftGauges = useLocalStorage<boolean>('spacex_show_left_gauges', true)
  const showRightPanel = useLocalStorage<boolean>('spacex_show_right_panel', true)
  const rightPanelMode = useLocalStorage<'gauges' | 'displayInfo'>('spacex_right_panel_mode', 'displayInfo')

  const timestamps = useLocalStorage<number[]>('spacex_timestamps_seconds', initialEventTimes)
  const nodeNames = useLocalStorage<string[]>('spacex_nodenames_zh', initialEventNames)

  const missionTimeRaw = ref(defaultMissionDurationSeconds)
  const timeValueRaw = ref(defaultCountdownStartSeconds)
  const jumpTargetTimeRaw = ref<string | number>('')

  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)
  const timerClock = ref({
    isPositive: false,
    timeString: '00:00:00',
  })

  // --- 2. Getters (计算属性) ---
  const isTPlus = computed(() => currentTimeOffset.value >= 0)
  const missionTimeSeconds = computed(() => parseSeconds(missionTimeRaw.value))
  const processedTimestamps = computed(() => timestamps.value)
  const initialCountdownOffset = computed(() => {
    const secs = parseSeconds(timeValueRaw.value)
    return (Number.isNaN(secs) || secs <= 0) ? 0 : -secs
  })

  // --- 3. Actions (方法) ---
  let timerIntervalId: ReturnType<typeof setInterval> | null = null
  let targetT0TimestampMs: number | null = null
  let pauseTimeMs: number | null = null

  function addNode() {
    timestamps.value.push(0)
    nodeNames.value.push(`新事件 ${nodeNames.value.length + 1}`)
  }

  function deleteNode(index: number) {
    if (timestamps.value.length <= 1) {
      console.warn('至少需要保留一个事件节点。')
      return
    }
    timestamps.value.splice(index, 1)
    nodeNames.value.splice(index, 1)
  }

  function formatTimeForClock(totalSeconds: number) {
    const absValue = Math.abs(totalSeconds)
    let secondsForFormatting: number
    if (totalSeconds < 0)
      secondsForFormatting = Math.ceil(absValue)
    else
      secondsForFormatting = Math.floor(absValue)

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    const isPositive = !(totalSeconds < 0 || Object.is(totalSeconds, -0))

    return {
      isPositive,
      timeString: `${fHours}:${fMinutes}:${fSeconds}`,
    }
  }

  function updateTimer() {
    if (isPaused.value || !targetT0TimestampMs)
      return

    const nowMs = performance.now()
    const elapsedMsSinceT0 = nowMs - targetT0TimestampMs
    currentTimeOffset.value = elapsedMsSinceT0 / 1000
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
  }

  function _stopInternalTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId)
      timerIntervalId = null
    }
  }

  function _startInternalTimer() {
    _stopInternalTimer()
    if (!targetT0TimestampMs) {
      console.warn('无法启动计时器：未正确设置目标T0时间戳 (targetT0TimestampMs)。')
      return
    }
    updateTimer()
    timerIntervalId = setInterval(updateTimer, 50)
  }

  function toggleLaunch() {
    if (!isStarted.value) {
      isStarted.value = true
      isPaused.value = false
      pauseTimeMs = null
      targetT0TimestampMs = performance.now() - (currentTimeOffset.value * 1000)
      _startInternalTimer()
    }
    else if (isPaused.value) {
      isPaused.value = false
      if (pauseTimeMs && targetT0TimestampMs) {
        const pausedDurationMs = performance.now() - pauseTimeMs
        targetT0TimestampMs += pausedDurationMs
      }
      pauseTimeMs = null
      _startInternalTimer()
    }
    else {
      isPaused.value = true
      pauseTimeMs = performance.now()
      _stopInternalTimer()
    }
  }

  function resetTimer() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    targetT0TimestampMs = null
    pauseTimeMs = null
    currentTimeOffset.value = initialCountdownOffset.value
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
    jumpTargetTimeRaw.value = ''
  }

  function jumpToTime() {
    const targetSeconds = parseSeconds(jumpTargetTimeRaw.value)
    if (Number.isNaN(targetSeconds)) {
      console.warn('无效的跳转时间')
      return
    }
    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)

    if (isStarted.value && !isPaused.value) {
      _stopInternalTimer()
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      _startInternalTimer()
    }
    else if (isStarted.value && isPaused.value) {
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
    }
    else {
      targetT0TimestampMs = null
    }
  }

  function restoreBackgroundImage() {
    if (backgroundImageUrl.value?.startsWith('blob:'))
      URL.revokeObjectURL(backgroundImageUrl.value)
    backgroundImageUrl.value = defaultConfig.backgroundImageUrl
  }

  function cleanup() {
    _stopInternalTimer()
    if (backgroundImageUrl.value?.startsWith('blob:'))
      URL.revokeObjectURL(backgroundImageUrl.value)
  }

  // 初始化计时器状态
  resetTimer()

  // --- 4. 返回所有 state, getters, 和 actions ---
  return {
    timelineVersion,
    missionName,
    vehicleName,
    currentSpeed,
    currentAltitude,
    fuelPercentage,
    gForce,
    backgroundImageUrl,
    showLeftGauges,
    showRightPanel,
    rightPanelMode,
    restoreBackgroundImage,
    timestamps,
    nodeNames,
    missionTimeRaw,
    timeValueRaw,
    timerClock,
    isStarted,
    isPaused,
    isTPlus,
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
    displayInfo,
    cleanup,
  }
})
