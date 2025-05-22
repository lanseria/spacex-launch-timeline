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

// 辅助函数：将字符串或数字解析为整数秒
function parseSeconds(timeValue: string | number): number {
  if (typeof timeValue === 'number')
    return Math.round(timeValue) // 如果是数字，直接返回（可选择取整）

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

  const initialTimestamps = ref<number[]>(initialEventTimes)
  const initialNodeNames = ref<string[]>(initialEventNames)

  if (import.meta.client) {
    const storedTimestamps = localStorage.getItem('spacex_timestamps_seconds')
    if (storedTimestamps) {
      try {
        const parsed = JSON.parse(storedTimestamps)
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'number'))
          initialTimestamps.value = parsed
      }
      catch (e) { console.error('解析存储的时间戳（秒）时出错:', e) }
    }
    const storedNodeNames = localStorage.getItem('spacex_nodenames_zh')
    if (storedNodeNames) {
      try {
        const parsed = JSON.parse(storedNodeNames)
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string'))
          initialNodeNames.value = parsed
      }
      catch (e) { console.error('解析存储的节点名称时出错:', e) }
    }
  }

  const timestamps = ref<number[]>(initialTimestamps.value)
  const nodeNames = ref<string[]>(initialNodeNames.value)
  const missionTimeRaw = ref(String(defaultMissionDurationSeconds))
  const timeValueRaw = ref(String(defaultCountdownStartSeconds))

  const timerClock = ref('T - 00:00:00') // 用于UI显示的文本时钟
  const isStarted = ref(false)
  const currentTimeOffset = ref(0) // 用于SVG平滑动画的精确时间偏移 (秒)

  const missionTimeSeconds = computed(() => parseSeconds(missionTimeRaw.value))
  const processedTimestamps = computed(() => timestamps.value) // 已经是秒了

  watch(timestamps, (newVal) => {
    if (import.meta.client)
      localStorage.setItem('spacex_timestamps_seconds', JSON.stringify(newVal))
  }, { deep: true })

  watch(nodeNames, (newVal) => {
    if (import.meta.client)
      localStorage.setItem('spacex_nodenames_zh', JSON.stringify(newVal))
  }, { deep: true })

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
  let lastClockUpdateTime = 0 // 用于节流 timerClock 的更新

  // 格式化时间 (用于 timerClock 显示，秒级精度)
  function formatTimeForClock(totalSeconds: number): string {
    const sign = totalSeconds < 0 ? '-' : '+'
    const absIntSeconds = Math.floor(Math.abs(totalSeconds)) // 取整秒

    const hours = Math.floor(absIntSeconds / 3600)
    const minutes = Math.floor((absIntSeconds % 3600) / 60)
    const seconds = Math.floor(absIntSeconds % 60)

    const fHours = String(hours).padStart(2, '0')
    const fMinutes = String(minutes).padStart(2, '0')
    const fSeconds = String(seconds).padStart(2, '0')

    return `T ${sign} ${fHours}:${fMinutes}:${fSeconds}`
  }

  // T- 倒计时逻辑 (使用 requestAnimationFrame)
  function setCountdownTimer(initialDurationSeconds: number, onT0Callback: () => void) {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)

    const countdownStartTime = performance.now()
    // 初始化 currentTimeOffset 和 timerClock
    currentTimeOffset.value = -initialDurationSeconds
    timerClock.value = formatTimeForClock(-initialDurationSeconds)
    lastClockUpdateTime = performance.now()

    function animateCountdown(now: number) {
      const elapsedMillis = now - countdownStartTime
      const elapsedSeconds = elapsedMillis / 1000
      const remainingSecondsFloat = initialDurationSeconds - elapsedSeconds

      if (remainingSecondsFloat <= 0) {
        currentTimeOffset.value = 0 // 精确到 T-0
        timerClock.value = formatTimeForClock(0) // 显示 T + 00:00:00 或 T - 00:00:00

        if (animationFrameId)
          cancelAnimationFrame(animationFrameId)
        animationFrameId = null // 清除ID
        onT0Callback() // 到达 T-0，执行回调
        return
      }

      currentTimeOffset.value = -remainingSecondsFloat // 平滑更新 SVG 偏移

      // 节流更新 timerClock (大约每秒一次)
      if (now - lastClockUpdateTime >= 990) { // 接近1秒 (用990ms避免累积误差跳过)
        timerClock.value = formatTimeForClock(-remainingSecondsFloat)
        lastClockUpdateTime = now
      }

      animationFrameId = requestAnimationFrame(animateCountdown)
    }
    animationFrameId = requestAnimationFrame(animateCountdown)
  }

  // T+ 正向计时逻辑 (使用 requestAnimationFrame)
  function startTplusTimer() {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId) // 确保之前的动画已停止

    const tPlusStartTime = performance.now()
    // currentTimeOffset 此时应为 0 (由 setCountdownTimer 在T-0时设置)
    timerClock.value = formatTimeForClock(0) // 确保T+0显示
    lastClockUpdateTime = performance.now()

    function animateTplus(now: number) {
      const elapsedMillis = now - tPlusStartTime
      const elapsedSecondsSinceT0 = elapsedMillis / 1000

      currentTimeOffset.value = elapsedSecondsSinceT0 // 平滑更新 SVG 偏移

      // 节流更新 timerClock
      if (now - lastClockUpdateTime >= 990) {
        timerClock.value = formatTimeForClock(elapsedSecondsSinceT0)
        lastClockUpdateTime = now
      }

      animationFrameId = requestAnimationFrame(animateTplus)
    }
    animationFrameId = requestAnimationFrame(animateTplus)
  }

  function toggleLaunch() {
    isStarted.value = !isStarted.value
    if (isStarted.value) {
      const countdownStartSec = parseSeconds(timeValueRaw.value)
      if (Number.isNaN(countdownStartSec) || countdownStartSec <= 0) { // 必须是正数秒
        console.warn('请输入有效的正数秒数作为倒计时起点。')
        isStarted.value = false // 重置启动状态
        return
      }

      // 清理任何可能正在运行的旧动画帧
      if (animationFrameId)
        cancelAnimationFrame(animationFrameId)

      setCountdownTimer(countdownStartSec, () => {
        // 当倒计时结束 (到达T-0) 后的回调
        startTplusTimer() // 开始T+计时
      })
    }
    else { // 停止
      if (animationFrameId)
        cancelAnimationFrame(animationFrameId)
      animationFrameId = null // 清除ID

      // 将时钟和SVG偏移重置回初始倒计时状态 (或T-0 если初始值无效)
      const initialCountdownSec = parseSeconds(timeValueRaw.value)
      if (!Number.isNaN(initialCountdownSec) && initialCountdownSec > 0) {
        currentTimeOffset.value = -initialCountdownSec
        timerClock.value = formatTimeForClock(-initialCountdownSec)
      }
      else {
        currentTimeOffset.value = 0
        timerClock.value = formatTimeForClock(0) // 默认重置为T-0
      }
    }
  }

  onBeforeUnmount(() => {
    if (animationFrameId)
      cancelAnimationFrame(animationFrameId)
  })

  // 初始化时钟显示和SVG偏移 (不启动动画)
  const initialCountdownSecOnLoad = parseSeconds(timeValueRaw.value)
  if (!Number.isNaN(initialCountdownSecOnLoad) && initialCountdownSecOnLoad > 0) {
    currentTimeOffset.value = -initialCountdownSecOnLoad
    timerClock.value = formatTimeForClock(-initialCountdownSecOnLoad)
  }
  else {
    // 如果初始输入无效或为0，默认显示T-0
    currentTimeOffset.value = 0
    timerClock.value = formatTimeForClock(0)
  }

  return {
    missionNameDisplay: computed(() => defaultConfig.missionName.zh),
    vehicleNameDisplay: computed(() => defaultConfig.vehicle.zh),
    timestamps,
    nodeNames,
    missionTimeRaw,
    timeValueRaw,
    timerClock,
    isStarted,
    processedTimestamps,
    missionTimeSeconds,
    currentTimeOffset, // 这个值现在会平滑地、高频地更新
    addNode,
    deleteNode,
    toggleLaunch,
  }
}
