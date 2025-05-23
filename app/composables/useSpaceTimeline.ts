// 默认配置数据
const defaultConfig = {
  missionName: {
    zh: '星链发射任务 (模拟)',
    en: 'Starlink Mission (Simulated)',
  },
  vehicle: {
    zh: '猎鹰9号运载火箭',
    en: 'Falcon 9 Rocket',
  },
  videoConfig: { // 当前未直接使用，但保留以备将来扩展
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
  const timeValueRaw = ref(defaultCountdownStartSeconds) // 用户设定的初始倒计时秒数 (正数)

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false) // 计时器是否被用户启动过
  const isPaused = ref(false) // 计时器当前是否处于暂停状态
  const currentTimeOffset = ref(0) // 精确时间偏移 (秒), T-为负, T+为正
  const jumpTargetTimeRaw = ref<string | number>('') // 跳转目标时间的原始输入

  const missionTimeSeconds = computed(() => parseSeconds(missionTimeRaw.value))
  const processedTimestamps = computed(() => timestamps.value)
  // 计算用户定义的初始倒计时起点 (始终为负值或0，用于 T- 开始)
  const initialCountdownOffset = computed(() => {
    const secs = parseSeconds(timeValueRaw.value)
    return (Number.isNaN(secs) || secs <= 0) ? 0 : -secs // 存为负值
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

  let animationFrameId: number | null = null
  let lastClockUpdateTime = 0

  function formatTimeForClock(totalSeconds: number): string {
    const sign = totalSeconds < 0 ? '-' : '+'
    // 对于T-0的特殊处理，确保显示为 T - 00:00:00 或 T + 00:00:00
    // Math.abs(0) is 0, -0 is also 0. So floor will make it clean.
    const absIntSeconds = Math.floor(Math.abs(totalSeconds))

    const hours = Math.floor(absIntSeconds / 3600)
    const minutes = Math.floor((absIntSeconds % 3600) / 60)
    const seconds = Math.floor(absIntSeconds % 60)

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    // 统一 T-0 附近的显示符号
    if (hours === 0 && minutes === 0 && seconds === 0 && totalSeconds <= 0 && totalSeconds > -1) {
      return `T - ${fHours}:${fMinutes}:${fSeconds}` // e.g. T-0 for -0.5s
    }
    return `T ${sign} ${fHours}:${fMinutes}:${fSeconds}`
  }

  function setCountdownTimer(durationSecondsToT0: number, onT0Callback: () => void) {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)

    const countdownSystemStartTime = performance.now()
    // durationSecondsToT0 是一个正数，表示距离T-0还有多少秒
    // currentTimeOffset 此时应该是 -durationSecondsToT0

    // 初始化显示，确保UI立即响应
    currentTimeOffset.value = -durationSecondsToT0
    timerClock.value = formatTimeForClock(-durationSecondsToT0)
    lastClockUpdateTime = performance.now()

    function animateCountdown(now: number) {
      if (isPaused.value)
        return // 如果暂停了，则不执行动画帧

      const elapsedMillis = now - countdownSystemStartTime
      const elapsedSeconds = elapsedMillis / 1000
      const remainingSecondsFloat = durationSecondsToT0 - elapsedSeconds

      if (remainingSecondsFloat <= 0) {
        currentTimeOffset.value = 0
        timerClock.value = formatTimeForClock(0)
        if (animationFrameId)
          cancelAnimationFrame(animationFrameId)
        animationFrameId = null
        onT0Callback()
        return
      }

      currentTimeOffset.value = -remainingSecondsFloat

      if (now - lastClockUpdateTime >= 990) {
        timerClock.value = formatTimeForClock(-remainingSecondsFloat)
        lastClockUpdateTime = now
      }
      animationFrameId = requestAnimationFrame(animateCountdown)
    }
    animationFrameId = requestAnimationFrame(animateCountdown)
  }

  function startTplusTimer(startOffsetSeconds = 0) {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)

    const tPlusSystemStartTime = performance.now()
    // startOffsetSeconds 是T+开始时的偏移量，通常是0，但继续或跳转时可能不是

    // 初始化显示
    currentTimeOffset.value = startOffsetSeconds
    timerClock.value = formatTimeForClock(startOffsetSeconds)
    lastClockUpdateTime = performance.now()

    function animateTplus(now: number) {
      if (isPaused.value)
        return

      const elapsedMillis = now - tPlusSystemStartTime
      const currentElapsedSeconds = startOffsetSeconds + elapsedMillis / 1000

      currentTimeOffset.value = currentElapsedSeconds

      if (now - lastClockUpdateTime >= 990) {
        timerClock.value = formatTimeForClock(currentElapsedSeconds)
        lastClockUpdateTime = now
      }
      animationFrameId = requestAnimationFrame(animateTplus)
    }
    animationFrameId = requestAnimationFrame(animateTplus)
  }

  function _stopInternalTimer() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function toggleLaunch() {
    if (!isStarted.value) { // === 点击 "开始倒计时" ===
      isStarted.value = true
      isPaused.value = false // 确保不是暂停状态

      // 从 currentTimeOffset.value (可能由跳转或重置设定) 开始
      const startFromOffset = currentTimeOffset.value

      if (startFromOffset < 0) {
        const durationToT0 = Math.abs(startFromOffset)
        if (durationToT0 > 0) {
          setCountdownTimer(durationToT0, () => startTplusTimer(0))
        }
        else { // startFromOffset is effectively 0 or invalid negative
          currentTimeOffset.value = 0 // Normalize
          timerClock.value = formatTimeForClock(0)
          startTplusTimer(0) // 直接开始T+
        }
      }
      else { // startFromOffset >= 0
        startTplusTimer(startFromOffset)
      }
    }
    else if (isPaused.value) { // === 点击 "继续" ===
      isPaused.value = false
      // 恢复计时，需要根据 currentTimeOffset 决定启动哪个计时器
      // lastClockUpdateTime 应该被重置，以便UI立即更新
      lastClockUpdateTime = performance.now() - 1000 // 强制下一次更新timerClock

      if (currentTimeOffset.value < 0) {
        setCountdownTimer(Math.abs(currentTimeOffset.value), () => startTplusTimer(0))
      }
      else {
        startTplusTimer(currentTimeOffset.value)
      }
    }
    else { // === 点击 "暂停" ===
      isPaused.value = true
      // _stopInternalTimer(); // 动画循环内部会检查 isPaused，所以这里不需要显式停止
      // requestAnimationFrame 在下一帧前会被 isPaused 阻塞
    }
  }

  function resetTimer() {
    _stopInternalTimer()
    isStarted.value = false
    isPaused.value = false
    currentTimeOffset.value = initialCountdownOffset.value // 使用计算属性获取初始T-值
    timerClock.value = formatTimeForClock(currentTimeOffset.value)
    jumpTargetTimeRaw.value = '' // 可选：清空跳转输入
  }

  function jumpToTime() {
    const targetSeconds = parseSeconds(jumpTargetTimeRaw.value)
    if (Number.isNaN(targetSeconds)) {
      console.warn('无效的跳转时间')
      // jumpTargetTimeRaw.value = ''; // 清空无效输入
      return
    }

    _stopInternalTimer() // 停止当前计时器（如果正在运行）

    currentTimeOffset.value = targetSeconds
    timerClock.value = formatTimeForClock(targetSeconds)
    lastClockUpdateTime = performance.now() - 1000 // 强制下一次更新timerClock

    // 如果计时器之前是启动且未暂停的，则跳转后继续运行
    // 否则，仅更新时间，保持暂停或未启动状态
    if (isStarted.value && !isPaused.value) {
      if (targetSeconds < 0) {
        setCountdownTimer(Math.abs(targetSeconds), () => startTplusTimer(0))
      }
      else {
        startTplusTimer(targetSeconds)
      }
    }
    // 如果是 isPaused.value 为 true，则跳转后依然是暂停状态，只是时间变了
    // 如果 isStarted.value 为 false，则跳转后依然是未启动状态，只是时间变了
    // jumpTargetTimeRaw.value = ''; // 可选：跳转后清空
  }

  onBeforeUnmount(() => {
    _stopInternalTimer()
  })

  // 初始化时设置正确的 currentTimeOffset 和 timerClock
  resetTimer() // 调用 reset 来设置初始状态

  return {
    missionNameDisplay: computed(() => defaultConfig.missionName.zh),
    vehicleNameDisplay: computed(() => defaultConfig.vehicle.zh),
    timestamps,
    nodeNames,
    missionTimeRaw,
    timeValueRaw, // 用户配置的初始倒计时秒数 (T-XXX 中的 XXX)
    timerClock,
    isStarted,
    isPaused, // 新增
    initialCountdownOffset,
    processedTimestamps,
    missionTimeSeconds,
    currentTimeOffset,
    jumpTargetTimeRaw, // 新增
    addNode,
    deleteNode,
    toggleLaunch, // 主控制按钮（开始/暂停/继续）
    resetTimer, // 新增
    jumpToTime, // 新增
  }
}
