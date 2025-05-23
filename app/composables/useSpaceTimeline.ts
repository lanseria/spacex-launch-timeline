// 默认配置数据 (保持不变)
const defaultConfig = {
  missionName: {
    zh: '星链发射任务 (模拟)',
    en: 'Starlink Mission (Simulated)',
  },
  vehicle: {
    zh: '猎鹰9号运载火箭',
    en: 'Falcon 9 Rocket',
  },
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

  const timestamps = useLocalStorage<number[]>('spacex_timestamps_seconds', initialEventTimes)
  const nodeNames = useLocalStorage<string[]>('spacex_nodenames_zh', initialEventNames)

  const missionTimeRaw = ref(defaultMissionDurationSeconds)
  const timeValueRaw = ref(defaultCountdownStartSeconds)

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  const isPaused = ref(false)
  const currentTimeOffset = ref(0) // 精确的时间偏移 (秒), T-为负, T+为正
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

  // --- 计时器核心状态 ---
  let timerIntervalId: ReturnType<typeof setInterval> | null = null
  let targetT0TimestampMs: number | null = null // T-0 发生时的 performance.now() 目标时间戳
  let pauseTimeMs: number | null = null // 暂停时的时间戳，用于计算暂停时长

  // --- 时间格式化函数 (与上一版相同，确保 T-0 显示正确) ---
  function formatTimeForClock(totalSeconds: number): string {
    const absValue = Math.abs(totalSeconds)
    let secondsForFormatting: number

    if (totalSeconds < 0) {
      secondsForFormatting = Math.ceil(absValue)
    }
    else {
      secondsForFormatting = Math.floor(absValue)
    }

    // 避免当 secondsForFormatting 为 0 但 totalSeconds < 0 时 (例如 -0.001s ceil后为0)，符号仍为 '-'
    // 这种情况应该显示 T + 00:00:00
    if (secondsForFormatting === 0 && totalSeconds < 0 && totalSeconds > -1) {
      // 这是非常接近0的负数，格式化后秒数为0，此时应该强制为 T+
      // 但由于我们期望 T-1 -> T+0，这个分支理论上不应该被频繁命中，
      // 因为 ceil(-0.x) 会是 1。
      // 为了保险起见，如果格式化后的秒数为0，则一定是T+时间。
      // 因此，上面的 sign 判断已经覆盖了这一点，当 secondsForFormatting 为 0 时，sign 必为 '+'
      // 所以这里的特殊处理可能不需要，除非有极端情况。
      // 保持原样，依赖 `sign` 和 `secondsForFormatting` 的计算。
    }

    const hours = Math.floor(secondsForFormatting / 3600)
    const minutes = Math.floor((secondsForFormatting % 3600) / 60)
    const seconds = secondsForFormatting % 60

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    // 最终决定符号，确保T-0.xxxx 显示为 T- ... 01，而 T-0 (精确) 或 T+0.xxxx 显示 T+ ... 00
    const finalSign = (totalSeconds < 0 && secondsForFormatting > 0) ? '-' : '+'

    return `T ${finalSign} ${fHours}:${fMinutes}:${fSeconds}`
  }

  // --- 核心计时器更新函数 ---
  function updateTimer() {
    if (isPaused.value || !targetT0TimestampMs)
      return

    const nowMs = performance.now()
    const remainingMsToT0 = targetT0TimestampMs - nowMs
    const newCurrentTimeOffset = remainingMsToT0 / -1000 // 转换为秒，T+为正，T-为负

    currentTimeOffset.value = newCurrentTimeOffset / 1000 * -1 // 修正：currentTimeOffset 应该是 T-为负，T+为正
    // currentTimeOffset.value = remainingMsToT0 / 1000; // 这是距离T0的剩余时间，T0前为正，T0后为负
    // 我们需要的是 currentTimeOffset: T- 为负, T+ 为正
    // 所以 currentTimeOffset.value = -remainingMsToT0 / 1000

    currentTimeOffset.value = -remainingMsToT0 / 1000

    // 检查是否到达或超过T-0
    if (remainingMsToT0 <= 0) {
      // 确保 currentTimeOffset 在 T-0 时为 0 或正数
      currentTimeOffset.value = Math.max(0, currentTimeOffset.value)
    }

    timerClock.value = formatTimeForClock(currentTimeOffset.value)

    // 如果已过 T-0，理论上应该停止倒计时器并启动 T+ 计时器。
    // 但在这个模型中，我们持续更新 currentTimeOffset，formatTimeForClock 会处理显示。
    // 我们不再区分 setCountdownTimer 和 startTplusTimer，而是统一由 targetT0TimestampMs 控制。
  }

  function _stopInternalTimer() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId)
      timerIntervalId = null
    }
  }

  function _startInternalTimer() {
    _stopInternalTimer() // 先停止任何可能存在的计时器
    if (!targetT0TimestampMs) { // 如果没有目标时间，则无法启动
      console.warn('无法启动计时器：未设置目标T0时间戳。')
      isStarted.value = false // 重置启动状态
      return
    }
    updateTimer() // 立即更新一次状态
    timerIntervalId = setInterval(updateTimer, 50) // 调整更新频率，例如50ms，可以根据需要调整以平衡精度和性能
  }

  function toggleLaunch() {
    if (!isStarted.value) { // === 点击 "开始倒计时" ===
      isStarted.value = true
      isPaused.value = false
      pauseTimeMs = null // 清除暂停时间

      // 计算 T-0 应该在未来的哪个 performance.now() 时间点发生
      // currentTimeOffset.value 此刻是初始的T-值 (负数)
      const durationToT0Ms = Math.abs(currentTimeOffset.value) * 1000
      targetT0TimestampMs = performance.now() + durationToT0Ms
      _startInternalTimer()
    }
    else if (isPaused.value) { // === 点击 "继续" ===
      isPaused.value = false
      if (pauseTimeMs && targetT0TimestampMs) {
        const pausedDurationMs = performance.now() - pauseTimeMs
        targetT0TimestampMs += pausedDurationMs // 将目标T0时间向后推移暂停的时长
      }
      pauseTimeMs = null
      _startInternalTimer() // 重新启动内部计时器，它会使用更新后的 targetT0TimestampMs
    }
    else { // === 点击 "暂停" ===
      isPaused.value = true
      pauseTimeMs = performance.now()
      // 不需要 _stopInternalTimer()，因为 updateTimer 内部会检查 isPaused
      // 但为了确保 setInterval 确实停止，明确调用一下更好
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

    _stopInternalTimer() // 停止当前计时器（如果正在运行）
    pauseTimeMs = null // 清除暂停时间，因为我们正在设定新的时间点

    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)

    // 如果计时器之前是启动且未暂停的，则跳转后需要重新计算 targetT0TimestampMs 并继续运行
    if (isStarted.value && !isPaused.value) {
      const durationToT0Ms = Math.abs(targetSeconds) * 1000 // 如果 targetSeconds 是 T+，这个 duration 是负的
      if (targetSeconds < 0) {
        targetT0TimestampMs = performance.now() + durationToT0Ms
      }
      else {
        // 如果跳转到 T+ 时间，T0 实际上已经过去了
        targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      }
      _startInternalTimer()
    }
    else if (isStarted.value && isPaused.value) {
      // 如果是暂停状态下跳转，仅更新时间，不改变暂停状态，但需要更新 targetT0TimestampMs 以便恢复时正确
      const durationToT0Ms = Math.abs(targetSeconds) * 1000
      if (targetSeconds < 0) {
        targetT0TimestampMs = performance.now() + durationToT0Ms
      }
      else {
        targetT0TimestampMs = performance.now() - (targetSeconds * 1000)
      }
      // 保持暂停状态，所以不调用 _startInternalTimer()
      // 当用户点击“继续”时，pauseTimeMs 会被用来校正 targetT0TimestampMs
    }
    else { // isStarted.value is false
      // 如果计时器未启动，跳转后，用户点击“开始”时，targetT0TimestampMs 会基于新的 currentTimeOffset 计算
      targetT0TimestampMs = null // 清除，待开始时重新计算
    }
  }

  onBeforeUnmount(() => {
    _stopInternalTimer()
  })

  // 初始化时设置正确的 currentTimeOffset 和 timerClock
  resetTimer()

  return {
    missionNameDisplay: computed(() => defaultConfig.missionName.zh),
    vehicleNameDisplay: computed(() => defaultConfig.vehicle.zh),
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
  }
}
