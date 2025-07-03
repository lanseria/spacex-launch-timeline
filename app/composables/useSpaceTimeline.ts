export interface AltitudePoint {
  time: number // 单位: 秒, 相对于 T-0
  altitude: number // 单位: KM, 保留一位小数
}
// 默认配置数据
const defaultConfig = {
  missionName: 'Starlink',
  vehicle: 'Falcon 9 Block 5',
  speed: 7501,
  altitude: 64, // 这是手动输入的默认高度
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

  const missionName = useLocalStorage<string>('spacex_mission_name', defaultConfig.missionName)
  const vehicleName = useLocalStorage<string>('spacex_vehicle_name', defaultConfig.vehicle)
  const currentSpeed = useLocalStorage<number>('spacex_telemetry_speed', defaultConfig.speed)
  const backgroundImageUrl = useSessionStorage<string>(
    'spacex_persisted_background_image_url',
    defaultConfig.backgroundImageUrl,
  )

  // [修改] 将四个独立的 useLocalStorage 替换为单个对象
  const displayInfo = useLocalStorage('spacex_display_info', defaultConfig.displayInfo)

  const showPanel = ref(true)

  const timestamps = useLocalStorage<number[]>('spacex_timestamps_seconds', initialEventTimes)
  const nodeNames = useLocalStorage<string[]>('spacex_nodenames_zh', initialEventNames)

  const missionTimeRaw = ref(defaultMissionDurationSeconds)
  const timeValueRaw = ref(defaultCountdownStartSeconds) // 用于设置倒计时起点

  const timerClock = ref({
    isPositive: false,
    timeString: '00:00:00',
  })
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0) // 当前时间偏移量 (秒), T-为负, T+为正
  const jumpTargetTimeRaw = ref<string | number>('')

  // --- 高度曲线相关 ---
  const manualAltitude = useLocalStorage<number>('spacex_manual_altitude_km', defaultConfig.altitude)
  const altitudeProfile = useLocalStorage<AltitudePoint[]>('spacex_altitude_profile_v1', []) // v1用于可能的结构升级

  function calculateAltitudeFromProfile(targetTime: number): number {
    if (!altitudeProfile.value || altitudeProfile.value.length === 0)
      return manualAltitude.value // 没有profile数据，返回手动值

    // 确保数据按时间排序
    const sortedProfile = [...altitudeProfile.value].sort((a, b) => a.time - b.time)

    if (sortedProfile.length === 0)
      return manualAltitude.value
    if (sortedProfile.length === 1)
      return sortedProfile[0]!.altitude // 只有一个点

    // 处理边界情况
    if (targetTime <= sortedProfile[0]!.time)
      return sortedProfile[0]!.altitude
    if (targetTime >= sortedProfile[sortedProfile.length - 1]!.time)
      return sortedProfile[sortedProfile.length - 1]!.altitude

    // 查找插值点
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
        return prevPoint.altitude // 防止除以零

      const timeRatio = (targetTime - prevPoint.time) / (nextPoint.time - prevPoint.time)
      const interpolatedAltitude = prevPoint.altitude + (nextPoint.altitude - prevPoint.altitude) * timeRatio
      return Number.parseFloat(interpolatedAltitude.toFixed(1)) // 保留一位小数
    }

    // 如果没有找到合适的插值区间 (理论上不应该发生，因为有边界处理)
    // 可以返回手动值或最后一个点的值作为回退
    console.warn(`未能为时间 ${targetTime} 找到插值区间，返回手动高度。`)
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
            // 基础校验
            if (Array.isArray(parsedData) && parsedData.every(p => typeof p.time === 'number' && typeof p.altitude === 'number')) {
              altitudeProfile.value = parsedData as AltitudePoint[]
              // eslint-disable-next-line no-console
              console.log('高度数据加载成功:', altitudeProfile.value)
              resolve()
            }
            else {
              console.error('无效的高度数据格式。期望得到 {time: number, altitude: number}[] 格式。')
              reject(new Error('无效的高度数据格式。'))
            }
          }
          else {
            reject(new Error('无法读取文件内容。'))
          }
        }
        catch (error) {
          console.error('解析高度数据失败:', error)
          reject(error)
        }
      }
      reader.onerror = (error) => {
        console.error('读取文件失败:', error)
        reject(error)
      }
      reader.readAsText(file)
    })
  }

  function clearAltitudeProfile(): void {
    altitudeProfile.value = []
    // eslint-disable-next-line no-console
    console.log('高度数据已清空。')
  }
  // --- 高度曲线相关结束 ---

  const isTPlus = computed(() => currentTimeOffset.value >= 0)
  const missionTimeSeconds = computed(() => parseSeconds(missionTimeRaw.value))
  const processedTimestamps = computed(() => timestamps.value)
  const initialCountdownOffset = computed(() => {
    const secs = parseSeconds(timeValueRaw.value)
    return (Number.isNaN(secs) || secs <= 0) ? 0 : -secs // T-时间为负数
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
  let targetT0TimestampMs: number | null = null // T=0 时刻的 performance.now() 时间戳
  let pauseTimeMs: number | null = null // 暂停时记录的 performance.now()

  function formatTimeForClock(totalSeconds: number): { isPositive: boolean, timeString: string } {
    const absValue = Math.abs(totalSeconds)
    let secondsForFormatting: number

    if (totalSeconds < 0) {
      // 对于负数，我们希望 -0.1s 显示为 T - 00:00:01 (向上取整到秒)
      secondsForFormatting = Math.ceil(absValue)
    }
    else {
      // 对于正数，我们希望 +0.9s 显示为 T + 00:00:00 (向下取整到秒)
      secondsForFormatting = Math.floor(absValue)
    }

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    // Determine if the time is positive or negative
    // Note: Object.is(-0, -0) is true, so we check for -0 specifically
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
    currentTimeOffset.value = elapsedMsSinceT0 / 1000 // 直接计算当前时间点，无需max(0,...)

    timerClock.value = formatTimeForClock(currentTimeOffset.value)
  }

  function _stopInternalTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId)
      timerIntervalId = null
    }
  }

  function _startInternalTimer() {
    _stopInternalTimer() // 先停止任何现有计时器
    if (!targetT0TimestampMs) {
      // 这是一个关键的保护，如果 targetT0TimestampMs 未设定，不应该启动
      console.warn('无法启动计时器：未正确设置目标T0时间戳 (targetT0TimestampMs)。')
      // isStarted.value = false; // 可以考虑是否在此处重置 isStarted，取决于逻辑
      return
    }
    updateTimer() // 立即执行一次以更新显示
    timerIntervalId = setInterval(updateTimer, 50) // 推荐使用 requestAnimationFrame 或更精密的计时器
  }

  function toggleLaunch() {
    if (!isStarted.value) { // --- 从停止状态到开始 ---
      isStarted.value = true
      isPaused.value = false
      pauseTimeMs = null
      // currentTimeOffset.value 此时应为 initialCountdownOffset.value 或 jumpToTime 设定的值
      // targetT0TimestampMs 是未来的 T=0 时刻
      // 例如，如果 currentTimeOffset.value = -60 (T-60s)
      // 则 targetT0TimestampMs = performance.now() + 60000ms
      targetT0TimestampMs = performance.now() - (currentTimeOffset.value * 1000)
      _startInternalTimer()
    }
    else if (isPaused.value) { // --- 从暂停状态到继续 ---
      isPaused.value = false
      if (pauseTimeMs && targetT0TimestampMs) {
        // 调整 targetT0TimestampMs 以弥补暂停所花费的时间
        const pausedDurationMs = performance.now() - pauseTimeMs
        targetT0TimestampMs += pausedDurationMs
      }
      pauseTimeMs = null
      _startInternalTimer() // 使用更新后的 targetT0TimestampMs 重新启动
    }
    else { // --- 从运行状态到暂停 ---
      isPaused.value = true
      pauseTimeMs = performance.now() // 记录暂停的时刻
      _stopInternalTimer()
    }
  }

  function resetCoreTimer() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    targetT0TimestampMs = null
    pauseTimeMs = null
    // 重置时，currentTimeOffset 应回到初始倒计时起点
    currentTimeOffset.value = initialCountdownOffset.value
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
    jumpTargetTimeRaw.value = '' // 清空跳转输入
  }

  function jumpToTime() {
    const targetSeconds = parseSeconds(jumpTargetTimeRaw.value)
    if (Number.isNaN(targetSeconds)) {
      console.warn('无效的跳转时间')
      return
    }

    // 无论计时器当前状态如何，都更新 currentTimeOffset
    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds) // 立即更新时钟显示

    // 根据计时器状态调整 targetT0TimestampMs 和计时器行为
    if (isStarted.value && !isPaused.value) { // 计时器正在运行
      _stopInternalTimer() // 先停止当前计时
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000) // 基于新的offset重新计算T0
      _startInternalTimer() // 以新的T0启动
    }
    else if (isStarted.value && isPaused.value) { // 计时器已启动但已暂停
      // 仅更新 targetT0TimestampMs，计时器保持暂停状态
      // 当用户点击“继续”时，会使用这个新的 targetT0TimestampMs
      targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      // pauseTimeMs 保持不变，因为它记录的是上一次暂停的时刻
    }
    else { // 计时器未启动
      // targetT0TimestampMs 不需要设置，因为计时器还未开始
      // 当用户点击“开始”时，会根据当前的 currentTimeOffset (已被jumpToTime更新) 来计算 targetT0TimestampMs
      targetT0TimestampMs = null // 确保未启动时不持有旧的 targetT0
    }
  }

  function restoreBackgroundImage() {
    if (backgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
    backgroundImageUrl.value = defaultConfig.backgroundImageUrl
  }

  onBeforeUnmount(() => {
    _stopInternalTimer()
    if (backgroundImageUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundImageUrl.value)
    }
  })

  // 初始化计时器状态
  resetCoreTimer()

  return {
    missionName,
    vehicleName,
    currentSpeed,
    // currentAltitude, // 现在是 computed
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
    displayInfo,

    // --- 高度曲线相关导出 ---
    manualAltitude, // 手动输入的高度 ref
    altitudeProfile, // 高度数据点数组 ref
    currentAltitude, // 计算后的当前高度 (computed)
    loadAltitudeProfile, // 加载数据的函数
    clearAltitudeProfile, // 清空数据的函数
  }
}
