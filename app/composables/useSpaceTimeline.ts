// composables/useSpaceTimeline.ts
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface TimelineNode {
  time: number | string // Can be "0" or "8:37" initially
  name: string
}

// Helper to convert MM:SS or M:S to float minutes
function convertTimeToFloat(timeStr: string | number): number {
  if (timeStr === 0 || timeStr === '0') {
    return 0.0
  }
  if (typeof timeStr === 'number')
    return Number.parseFloat(timeStr.toFixed(2))

  const parts = String(timeStr).split(':')
  if (parts.length !== 2)
    return Number.parseFloat(timeStr.toString()) || 0.0 // Fallback if not in MM:SS

  const minutes = Number.parseInt(parts[0], 10)
  const seconds = Number.parseInt(parts[1], 10)

  if (isNaN(minutes) || isNaN(seconds))
    return 0.0

  return Number.parseFloat((minutes + seconds / 60).toFixed(2))
}

export function useSpaceTimeline() {
  const initialTimestamps = ref<Array<string | number>>(['0'])
  const initialNodeNames = ref<string[]>(['Node 1'])

  if (import.meta.client) {
    const storedTimestamps = localStorage.getItem('timestamps')
    if (storedTimestamps) {
      try {
        initialTimestamps.value = JSON.parse(storedTimestamps)
      }
      catch (e) { console.error('Error parsing stored timestamps', e) }
    }
    const storedNodeNames = localStorage.getItem('nodenames')
    if (storedNodeNames) {
      try {
        initialNodeNames.value = JSON.parse(storedNodeNames)
      }
      catch (e) { console.error('Error parsing stored node names', e) }
    }
  }

  const timestamps = ref<(string | number)[]>(initialTimestamps.value)
  const nodeNames = ref<string[]>(initialNodeNames.value)

  const missionTimeRaw = ref('8:37') // Stored as string e.g., "8:37"
  const timeValueRaw = ref('0.1') // Stored as string e.g., "0.1"

  const timerClock = ref('T - 00:00:00')
  const isStarted = ref(false)
  // const rotationAngle = ref(0.1); // This was an input, but seems tied to SVG logic

  // Derived reactive values (float representations for calculations)
  const processedTimestamps = ref<number[]>([])
  const missionTimeFloat = ref(0)

  const updateProcessedTimestamps = () => {
    processedTimestamps.value = timestamps.value.map(t => convertTimeToFloat(t))
  }

  const updateMissionTimeFloat = () => {
    missionTimeFloat.value = convertTimeToFloat(missionTimeRaw.value)
  }

  watch(timestamps, (newVal) => {
    if (import.meta.client)
      localStorage.setItem('timestamps', JSON.stringify(newVal))
    updateProcessedTimestamps()
  }, { deep: true })

  watch(nodeNames, (newVal) => {
    if (import.meta.client)
      localStorage.setItem('nodenames', JSON.stringify(newVal))
  }, { deep: true })

  watch(missionTimeRaw, () => {
    updateMissionTimeFloat()
  })

  onMounted(() => {
    updateProcessedTimestamps()
    updateMissionTimeFloat()
  })

  function addNode() {
    timestamps.value.push(0)
    nodeNames.value.push(`Node ${nodeNames.value.length + 1}`)
  }

  function deleteNode(index: number) {
    if (timestamps.value.length <= 1)
      return // Prevent deleting the last node
    timestamps.value.splice(index, 1)
    nodeNames.value.splice(index, 1)
  }

  // Timer and rotation logic
  let timerIntervalId: ReturnType<typeof setInterval> | null = null
  let rotationIntervalId: ReturnType<typeof setInterval> | null = null

  function setTimer(inputMinutesStr: string, mode: 'inc' | 'dec') {
    if (timerIntervalId)
      clearInterval(timerIntervalId)

    const inputMinutes = Number.parseFloat(inputMinutesStr)
    if (isNaN(inputMinutes)) {
      console.error('Invalid time value for timer:', inputMinutesStr)
      return
    }

    let durationSeconds = inputMinutes * 60
    let timer = durationSeconds

    timerIntervalId = setInterval(() => {
      const hours = Math.floor(timer / 3600)
      const minutes = Math.floor((timer % 3600) / 60)
      const seconds = Math.floor(timer % 60)

      const fHours = hours < 10 ? `0${hours}` : String(hours)
      const fMinutes = minutes < 10 ? `0${minutes}` : String(minutes)
      const fSeconds = seconds < 10 ? `0${seconds}` : String(seconds)

      const prefix = mode === 'dec' ? 'T - ' : 'T + '
      timerClock.value = `${prefix}${fHours}:${fMinutes}:${fSeconds}`

      timer = mode === 'dec' ? --timer : ++timer

      if (mode === 'dec' && timer < 0) {
        if (timerIntervalId)
          clearInterval(timerIntervalId)
        startRotation() // Start rotation after countdown finishes
        setTimer('0', 'inc') // Start count-up timer
      }
    }, 1000)
  }

  function startRotation() {
    if (rotationIntervalId)
      clearInterval(rotationIntervalId)
    // The original rotation logic was complex and tied to specific constants.
    // This needs to be adapted based on how plotNodesOnCircle uses the timestamps.
    // For now, this is a placeholder. The key is that `processedTimestamps` will be dynamically updated.

    rotationIntervalId = setInterval(() => {
      // This logic needs to match how the SVG expects data to "move"
      // Original logic: newTimestamps[k] = v - 0.001;
      // This implies timestamps represent decreasing time-to-event
      processedTimestamps.value = processedTimestamps.value.map(t => Math.max(0, Number.parseFloat((t - 0.01).toFixed(3)))) // Decrease slightly, ensure positive
      // If an event time reaches 0, it's "happening"
    }, 75) // Original interval
  }

  function toggleLaunch() {
    isStarted.value = !isStarted.value
    if (isStarted.value) {
      setTimer(timeValueRaw.value, 'dec')
    }
    else {
      if (timerIntervalId)
        clearInterval(timerIntervalId)
      if (rotationIntervalId)
        clearInterval(rotationIntervalId)
      timerClock.value = 'T - 00:00:00' // Reset clock display
    }
  }

  onBeforeUnmount(() => {
    if (timerIntervalId)
      clearInterval(timerIntervalId)
    if (rotationIntervalId)
      clearInterval(rotationIntervalId)
  })

  return {
    timestamps,
    nodeNames,
    missionTimeRaw,
    timeValueRaw,
    timerClock,
    isStarted,
    // rotationAngle, // If it's just an input, keep it in page component
    processedTimestamps, // For the SVG component
    missionTimeFloat, // For the SVG component
    addNode,
    deleteNode,
    toggleLaunch,
    // updateTimer: (val: string) => { timeValueRaw.value = val; }, // Handled by v-model
    // updateMissionTime: (val: string) => { missionTimeRaw.value = val; }, // Handled by v-model
  }
}
