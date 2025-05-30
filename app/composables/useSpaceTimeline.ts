export interface AltitudePoint {
  time: number // 单位: 秒, 相对于 T-0
  altitude: number // 单位: KM, 保留一位小数
}

export interface SpeedPoint { // 新增
  time: number // 单位: 秒, 相对于 T-0
  speed: number // 单位: KM/H
}

export interface DynamicTextEntry { // 新增
  time: number // 单位: 秒, 相对于 T-0, 文本开始显示的时间
  title: string
  descriptions: string[] // 多行描述
  duration: number // 单位: 秒, 文本持续显示的时长
}

// 默认配置数据
const defaultConfig = {
  missionName: 'Starlink',
  vehicle: 'Falcon 9 Block 5',
  speed: 7501, // 这是手动输入的默认速度
  altitude: 64, // 这是手动输入的默认高度
  backgroundImageUrl: '/assets/images/falcon9_16_9.jpg',
  defaultMaxQTitle: 'MAX-Q',
  defaultMaxQLine1: 'MAXIMUM DYNAMIC PRESSURE',
  defaultMaxQLine2: 'THIS IS THE LARGEST AMOUNT OF STRESS',
  defaultMaxQLine3: 'EXERTED ON THE VEHICLE',
  events: [ // 确保 events 也在 defaultConfig 中
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

  const missionName = useLocalStorage<string>('spacex_mission_name_v1', defaultConfig.missionName) // v1 for potential future structure changes
  const vehicleName = useLocalStorage<string>('spacex_vehicle_name_v1', defaultConfig.vehicle)
  const backgroundImageUrl = useSessionStorage<string>( // 使用 SessionStorage 使得背景图仅在当前会话保留
    'spacex_temp_background_image_url', // 更明确的键名
    defaultConfig.backgroundImageUrl,
  )

  const showPanel = ref(true)

  const timestamps = useLocalStorage<number[]>('spacex_timestamps_seconds_v1', initialEventTimes)
  const nodeNames = useLocalStorage<string[]>('spacex_nodenames_zh_v1', initialEventNames)

  const missionTimeRaw = ref(defaultMissionDurationSeconds)
  const timeValueRaw = ref(defaultCountdownStartSeconds)

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0)
  const jumpTargetTimeRaw = ref<string | number>('')

  // --- 高度曲线相关 ---
  const manualAltitude = useLocalStorage<number>('spacex_manual_altitude_km_v1', defaultConfig.altitude)
  const altitudeProfile = useLocalStorage<AltitudePoint[]>('spacex_altitude_profile_v1', [])

  function calculateAltitudeFromProfile(targetTime: number): number {
    if (!altitudeProfile.value || altitudeProfile.value.length === 0)
      return manualAltitude.value

    const sortedProfile = [...altitudeProfile.value].sort((a, b) => a.time - b.time)
    if (sortedProfile.length === 0)
      return manualAltitude.value
    if (sortedProfile.length === 1)
      return sortedProfile[0]!.altitude

    if (targetTime <= sortedProfile[0]!.time)
      return sortedProfile[0]!.altitude
    if (targetTime >= sortedProfile[sortedProfile.length - 1]!.time)
      return sortedProfile[sortedProfile.length - 1]!.altitude

    let prevPoint: AltitudePoint | null = null
    let nextPoint: AltitudePoint | null = null
    for (let i = 0; i < sortedProfile.length - 1; i++) {
      if (targetTime >= sortedProfile[i]!.time && targetTime <= sortedProfile[i + 1]!.time) {
        prevPoint = sortedProfile[i]!
        nextPoint = sortedProfile[i + 1]!
        break
      }
    }
    if (prevPoint && nextPoint) {
      if (prevPoint.time === nextPoint.time)
        return prevPoint.altitude
      const timeRatio = (targetTime - prevPoint.time) / (nextPoint.time - prevPoint.time)
      const interpolatedAltitude = prevPoint.altitude + (nextPoint.altitude - prevPoint.altitude) * timeRatio
      return Number.parseFloat(interpolatedAltitude.toFixed(1))
    }
    return manualAltitude.value
  }

  const currentAltitude = computed<number>(() => {
    if (altitudeProfile.value && altitudeProfile.value.length > 0)
      return calculateAltitudeFromProfile(currentTimeOffset.value)
    return manualAltitude.value
  })

  async function loadAltitudeProfile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result
          if (typeof content === 'string') {
            const parsedData = JSON.parse(content)
            if (Array.isArray(parsedData) && parsedData.every(p => typeof p.time === 'number' && typeof p.altitude === 'number')) {
              altitudeProfile.value = parsedData as AltitudePoint[]
              resolve()
            }
            else { reject(new Error('无效的高度数据格式。')) }
          }
          else { reject(new Error('无法读取文件内容。')) }
        }
        catch (error) { reject(error) }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function clearAltitudeProfile(): void {
    altitudeProfile.value = []
  }

  // --- 速度曲线相关 --- (新增)
  const manualSpeed = useLocalStorage<number>('spacex_manual_speed_kmh_v1', defaultConfig.speed)
  const speedProfile = useLocalStorage<SpeedPoint[]>('spacex_speed_profile_v1', [])

  function calculateSpeedFromProfile(targetTime: number): number {
    if (!speedProfile.value || speedProfile.value.length === 0)
      return manualSpeed.value

    const sortedProfile = [...speedProfile.value].sort((a, b) => a.time - b.time)
    if (sortedProfile.length === 0)
      return manualSpeed.value
    if (sortedProfile.length === 1)
      return sortedProfile[0]!.speed

    if (targetTime <= sortedProfile[0]!.time)
      return sortedProfile[0]!.speed
    if (targetTime >= sortedProfile[sortedProfile.length - 1]!.time)
      return sortedProfile[sortedProfile.length - 1]!.speed

    let prevPoint: SpeedPoint | null = null
    let nextPoint: SpeedPoint | null = null
    for (let i = 0; i < sortedProfile.length - 1; i++) {
      if (targetTime >= sortedProfile[i]!.time && targetTime <= sortedProfile[i + 1]!.time) {
        prevPoint = sortedProfile[i]!
        nextPoint = sortedProfile[i + 1]!
        break
      }
    }
    if (prevPoint && nextPoint) {
      if (prevPoint.time === nextPoint.time)
        return prevPoint.speed
      const timeRatio = (targetTime - prevPoint.time) / (nextPoint.time - prevPoint.time)
      const interpolatedSpeed = prevPoint.speed + (nextPoint.speed - prevPoint.speed) * timeRatio
      return Math.round(interpolatedSpeed) // 速度通常为整数
    }
    return manualSpeed.value
  }

  const currentSpeed = computed<number>(() => { // 修改 currentSpeed
    if (speedProfile.value && speedProfile.value.length > 0)
      return calculateSpeedFromProfile(currentTimeOffset.value)
    return manualSpeed.value
  })

  async function loadSpeedProfile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result
          if (typeof content === 'string') {
            const parsedData = JSON.parse(content)
            if (Array.isArray(parsedData) && parsedData.every(p => typeof p.time === 'number' && typeof p.speed === 'number')) {
              speedProfile.value = parsedData as SpeedPoint[]
              resolve()
            }
            else { reject(new Error('无效的速度数据格式。')) }
          }
          else { reject(new Error('无法读取文件内容。')) }
        }
        catch (error) { reject(error) }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function clearSpeedProfile(): void {
    speedProfile.value = []
  }
  // --- 速度曲线相关结束 ---

  // --- 动态文本配置 ---
  const dynamicTextEntries = useLocalStorage<DynamicTextEntry[]>('spacex_dynamic_text_profile_v1', [])

  const activeDynamicTextEntry = computed<DynamicTextEntry | null>(() => {
    // 这个计算属性只负责根据时间查找活动的条目，不关心 dynamicTextEntries 是否为空
    if (!dynamicTextEntries.value || dynamicTextEntries.value.length === 0) {
      return null
    }
    const now = currentTimeOffset.value
    return dynamicTextEntries.value.find(entry => now >= entry.time && now < (entry.time + entry.duration)) || null
  })

  // 是否应该显示动态文本区域 (如果导入了配置但当前时间不匹配，则不显示)
  const shouldShowDynamicText = computed<boolean>(() => {
    // 如果有动态文本条目，并且当前时间匹配一个条目
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      return activeDynamicTextEntry.value !== null
    }
    // 如果没有导入动态文本条目，则总是“准备好”显示默认文本 (如果默认文本存在)
    // 或者，也可以根据是否有默认文本来决定，这里假设默认文本总是想显示的
    return true // 或者根据 defaultConfig.defaultMaxQTitle 是否有值等来决定
  })

  const maxQTitle = computed<string>(() => {
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      // 如果导入了动态文本
      return activeDynamicTextEntry.value?.title || '' // 如果当前时间不匹配，则返回空字符串
    }
    // 如果没有导入动态文本，则使用默认值
    return defaultConfig.defaultMaxQTitle
  })

  const currentDescriptions = computed<string[]>(() => {
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      // 如果导入了动态文本
      return activeDynamicTextEntry.value?.descriptions || [] // 如果当前时间不匹配，则返回空数组
    }
    // 如果没有导入动态文本，则使用默认值
    return [
      defaultConfig.defaultMaxQLine1,
      defaultConfig.defaultMaxQLine2,
      defaultConfig.defaultMaxQLine3,
    ].filter(Boolean)
  })

  // maxQLine1, maxQLine2, maxQLine3 可以基于 currentDescriptions 派生，或者单独计算：
  const maxQLine1 = computed<string>(() => {
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      return activeDynamicTextEntry.value?.descriptions?.[0] || ''
    }
    return defaultConfig.defaultMaxQLine1
  })

  const maxQLine2 = computed<string>(() => {
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      return activeDynamicTextEntry.value?.descriptions?.[1] || ''
    }
    return defaultConfig.defaultMaxQLine2
  })

  const maxQLine3 = computed<string>(() => {
    if (dynamicTextEntries.value && dynamicTextEntries.value.length > 0) {
      return activeDynamicTextEntry.value?.descriptions?.[2] || ''
    }
    return defaultConfig.defaultMaxQLine3
  })

  async function loadDynamicTextProfile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result
          if (typeof content === 'string') {
            const parsedData = JSON.parse(content)
            // 基础校验
            if (Array.isArray(parsedData) && parsedData.every(p =>
              typeof p.time === 'number'
              && typeof p.title === 'string'
              && Array.isArray(p.descriptions) && p.descriptions.every((d: any) => typeof d === 'string')
              && typeof p.duration === 'number',
            )) {
              dynamicTextEntries.value = parsedData as DynamicTextEntry[]
              resolve()
            }
            else { reject(new Error('无效的动态文本数据格式。')) }
          }
          else { reject(new Error('无法读取文件内容。')) }
        }
        catch (error) { reject(error) }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function clearDynamicTextProfile(): void {
    dynamicTextEntries.value = []
  }
  // --- 动态文本配置结束 ---

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
    if (totalSeconds < 0) { secondsForFormatting = Math.ceil(absValue) }
    else { secondsForFormatting = Math.floor(absValue) }

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60
    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')
    const finalSign = (totalSeconds < 0 || (Object.is(totalSeconds, -0))) ? '-' : '+'
    return `T ${finalSign} ${fHours}:${fMinutes}:${fSeconds}`
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
    if (backgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
    backgroundImageUrl.value = defaultConfig.backgroundImageUrl
    triggerRef(backgroundImageUrl) // 确保 useSessionStorage 更新能被侦知
  }

  onBeforeUnmount(() => {
    _stopInternalTimer()
    if (backgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
  })

  resetCoreTimer()

  return {
    missionName,
    vehicleName,
    backgroundImageUrl,
    showPanel,
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
    resetTimer: resetCoreTimer,
    jumpToTime,

    // MAX-Q (现在是动态文本的计算属性)
    maxQTitle,
    maxQLine1,
    maxQLine2,
    maxQLine3,
    currentDescriptions, // 可以选择性导出这个

    manualAltitude,
    altitudeProfile,
    currentAltitude,
    loadAltitudeProfile,
    clearAltitudeProfile,

    manualSpeed,
    speedProfile,
    currentSpeed,
    loadSpeedProfile,
    clearSpeedProfile,

    // 动态文本相关导出
    shouldShowDynamicText,
    dynamicTextEntries,
    loadDynamicTextProfile,
    clearDynamicTextProfile,
  }
}
