// 默认配置数据
const defaultConfig = {
  missionName: 'Starlink',
  vehicle: 'Falcon 9 Block 5',
  speed: 7501, // 默认速度
  altitude: 64, // 默认高度
  backgroundImageUrl: '/falcon9_16_9.jpg',
  videoConfig: {
    type: 'local',
    source: '/videos/falcon9_starlink_launch.mp4',
    startTimeOffset: -13,
  },
  events: [
    { time: -300, name: 'ENGINE CHILL' },
    { time: -65, name: 'STRONGBACK RETRACT' },
    { time: -10, name: 'STARTUP' },
    { time: 0, name: 'LIFTOFF' },
    { time: 72, name: 'MAX-Q' },
    { time: 145, name: 'MECO' },
    { time: 195, name: 'FAIRING' },
    { time: 380, name: 'ENTRY BURN' },
    { time: 490, name: 'SECO-1' },
    { time: 530, name: 'LANDING' },
  ],
}

function parseSeconds(timeValue: string | number): number {
  if (typeof timeValue === 'number')
    return Math.round(timeValue)
  const num = Number.parseInt(timeValue, 10)
  return Number.isNaN(num) ? 0 : num
}

export function useSpaceTimeline() {
  const initialEventTimes = defaultConfig.events.map(event => event.time)
  const initialEventNames = defaultConfig.events.map(event => event.name)
  const minEventTime = Math.min(...initialEventTimes, 0)
  const maxEventTime = Math.max(...initialEventTimes, 0)
  const defaultMissionDurationSeconds = (maxEventTime - minEventTime) > 0
    ? Math.ceil((maxEventTime - minEventTime) / 600) * 600 + 600
    : 3600
  const firstNegativeEventTime = initialEventTimes.find(t => t < 0)
  const defaultCountdownStartSeconds = firstNegativeEventTime ? Math.abs(firstNegativeEventTime) : 60

  // --- 新增: 使用 useLocalStorage 持久化任务和飞行器信息 ---
  const missionName = useLocalStorage<string>('spacex_mission_name', defaultConfig.missionName)
  const vehicleName = useLocalStorage<string>('spacex_vehicle_name', defaultConfig.vehicle)
  const currentSpeed = useLocalStorage<number>('spacex_telemetry_speed', defaultConfig.speed)
  const currentAltitude = useLocalStorage<number>('spacex_telemetry_altitude', defaultConfig.altitude)

  // 用于存储用户通过输入框设置的或默认的背景URL，这个会被持久化
  const persistedBackgroundImageUrl = useLocalStorage<string>(
    'spacex_persisted_background_image_url',
    defaultConfig.backgroundImageUrl,
  )

  const timestamps = useLocalStorage<number[]>('spacex_timestamps_seconds', initialEventTimes)
  const nodeNames = useLocalStorage<string[]>('spacex_nodenames_zh', initialEventNames)

  const missionTimeRaw = ref(defaultMissionDurationSeconds)
  const timeValueRaw = ref(defaultCountdownStartSeconds)

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)
  const jumpTargetTimeRaw = ref<string | number>('')

  const isTPlus = computed(() => currentTimeOffset.value >= 0)

  const missionTimeSeconds = computed(() => parseSeconds(missionTimeRaw.value))
  const processedTimestamps = computed(() => timestamps.value)
  const initialCountdownOffset = computed(() => {
    const secs = parseSeconds(timeValueRaw.value)
    return (Number.isNaN(secs) || secs <= 0) ? 0 : -secs
  })

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

  let timerIntervalId: ReturnType<typeof setInterval> | null = null
  let targetT0TimestampMs: number | null = null
  let pauseTimeMs: number | null = null

  function formatTimeForClock(totalSeconds: number): string {
    const absValue = Math.abs(totalSeconds)
    let secondsForFormatting: number

    if (totalSeconds < 0) {
      secondsForFormatting = Math.ceil(absValue)
    }
    else {
      secondsForFormatting = Math.floor(absValue)
    }

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    const finalSign = (totalSeconds < 0 && secondsForFormatting > 0) ? '-' : '+'
    return `T ${finalSign} ${fHours}:${fMinutes}:${fSeconds}`
  }

  function updateTimer() {
    if (isPaused.value || !targetT0TimestampMs)
      return

    const nowMs = performance.now()
    const remainingMsToT0 = targetT0TimestampMs - nowMs
    const newCurrentTimeOffset = -remainingMsToT0 / 1000

    currentTimeOffset.value = newCurrentTimeOffset

    if (remainingMsToT0 <= 0) {
      currentTimeOffset.value = Math.max(0, currentTimeOffset.value)
    }

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
      console.warn('无法启动计时器：未设置目标T0时间戳。')
      isStarted.value = false
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
      const durationToT0Ms = Math.abs(currentTimeOffset.value) * 1000
      targetT0TimestampMs = performance.now() + durationToT0Ms
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

  function resetCoreTimer() {
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

    _stopInternalTimer()
    pauseTimeMs = null

    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)

    if (isStarted.value && !isPaused.value) {
      if (targetSeconds < 0) {
        targetT0TimestampMs = performance.now() + (Math.abs(targetSeconds) * 1000)
      }
      else {
        targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      }
      _startInternalTimer()
    }
    else if (isStarted.value && isPaused.value) {
      if (targetSeconds < 0) {
        targetT0TimestampMs = performance.now() + (Math.abs(targetSeconds) * 1000)
      }
      else {
        targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      }
    }
    else {
      targetT0TimestampMs = null
    }
  }

  function restoreBackgroundImage() {
    // 如果当前显示的是一个Object URL，先撤销它
    if (persistedBackgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(persistedBackgroundImageUrl.value)
    }
    // 恢复到持久化的URL
    persistedBackgroundImageUrl.value = defaultConfig.backgroundImageUrl
  }

  onBeforeUnmount(() => {
    _stopInternalTimer()
    // 组件卸载时，如果当前显示的是Object URL，也撤销它
    if (persistedBackgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(persistedBackgroundImageUrl.value)
    }
  })

  // 初始化计时器
  resetCoreTimer()

  return {
    // --- 修改/新增: 直接暴露 ref ---
    missionName, // 替换 missionNameDisplay
    vehicleName, // 替换 vehicleNameDisplay
    currentSpeed, // 新增，用于 Gauge 和配置
    currentAltitude, // 新增，用于 Gauge 和配置
    persistedBackgroundImageUrl, // 用于URL输入框绑定
    restoreBackgroundImage, // 还原背景的函数
    // --- 修改/新增结束 ---
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
    resetTimer: resetCoreTimer, // 暴露核心计时器重置函数
    jumpToTime,
  }
}
