// pages/index.vue
<script setup lang="ts">
const {
  timestamps,
  nodeNames,
  missionTimeRaw,
  timeValueRaw,
  timerClock,
  isStarted,
  processedTimestamps,
  missionTimeFloat,
  addNode,
  deleteNode,
  toggleLaunch,
} = useSpaceTimeline()

// The original `page.module.css` had extensive styling for a different timeline approach.
// That has been replaced by the SVG component.
// UnoCSS classes are used for general layout and input styling.
</script>

<template>
  <div>
    <Head>
      <Title>SpaceX Launch Timeline - Home</Title>
      <!-- Other head tags specific to this page -->
    </Head>

    <div class="mx-auto my-8 gap-4 grid grid-cols-1 max-w-[1200px] justify-center md:grid-cols-3">
      <!-- Card 1: Add Events -->
      <div class="card p-6 border border-gray-200 rounded-lg max-w-full dark:border-gray-700 md:max-w-xs">
        <h2 class="text-lg font-semibold mb-4">
          Add Events (In Minutes:Seconds or Minutes.Decimal)
        </h2>
        <div class="node_list_scrollbar pr-2 max-h-[200px] overflow-y-auto">
          <div v-for="(timestamp, i) in timestamps" :key="i" class="mb-2 flex items-center space-x-2">
            <input
              v-model="timestamps[i]" type="text" placeholder="e.g., 0:30 or 0.5"
              class="input-field flex-grow dark:text-white dark:bg-gray-700"
              :aria-label="`Timestamp for event ${i + 1}`"
            >
            <input
              v-model="nodeNames[i]" type="text" placeholder="Event Name"
              class="input-field flex-grow dark:text-white dark:bg-gray-700" :aria-label="`Name for event ${i + 1}`"
            >
            <button
              class="btn-action bg-red-500 hover:bg-red-600" :disabled="timestamps.length <= 1"
              aria-label="Delete event" @click="deleteNode(i)"
            >
              -
            </button>
          </div>
        </div>
        <button
          class="btn-action mt-2 bg-green-500 w-full hover:bg-green-600" aria-label="Add new event"
          @click="addNode"
        >
          +
        </button>
      </div>

      <!-- Card 2: Start/Stop & Mission Time -->
      <div class="card p-6 border border-gray-200 rounded-lg max-w-full dark:border-gray-700 md:max-w-xs">
        <h2 class="text-lg font-semibold mb-2">
          Controls
        </h2>
        <button
          class="btn-action mb-2 w-full"
          :class="isStarted ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-500 hover:bg-blue-600'"
          @click="toggleLaunch"
        >
          {{ isStarted ? "Stop" : "Start" }} Countdown
        </button>

        <div class="my-4 border-t border-gray-300 dark:border-gray-600" />

        <h2 class="text-lg font-semibold mb-2">
          Total Mission Time
        </h2>
        <input
          v-model="missionTimeRaw" type="text" placeholder="e.g., 8:37 or 8.61"
          class="input-field w-full dark:text-white dark:bg-gray-700" aria-label="Total mission time"
        >
        <small class="text-xs text-gray-500 dark:text-gray-400">Format: MM:SS or Minutes.Decimal (e.g., 8:37 or
          8.61)</small>
      </div>

      <!-- Card 3: Time to Launch & (Removed Rotation Angle input) -->
      <div class="card p-6 border border-gray-200 rounded-lg max-w-full dark:border-gray-700 md:max-w-xs">
        <h2 class="text-lg font-semibold mb-2">
          Time to Launch
        </h2>
        <input
          v-model="timeValueRaw" type="text" placeholder="e.g., 0.1 for 6s"
          class="input-field w-full dark:text-white dark:bg-gray-700" aria-label="Time to launch"
        >
        <small class="text-xs text-gray-500 dark:text-gray-400">In Minutes.Decimal (e.g., 0.1 for 6 seconds)</small>

        <!-- Rotation Angle was an input, but its calculation seems internal to the original SVG logic. -->
        <!-- If it's a user-configurable parameter for the SVG, it can be added back. -->
        <!-- For now, assuming it's derived or constant. -->
      </div>
    </div>

    <!-- Timer Clock Display -->
    <div
      class="text-4xl text-white font-mono mx-auto my-8 p-4 text-center rounded-lg bg-gray-800 max-w-md shadow-lg dark:bg-black"
    >
      {{ timerClock }}
    </div>

    <!-- SVG Timeline Visualization -->
    <TimelineSvg
      :timestamps="processedTimestamps" :node-names="nodeNames" :mission-duration="missionTimeFloat"
      :svg-width="1200" :svg-height="600"
    />
    <!-- Adjusted SVG height for better display, original was 1200x1200 which is very large -->

    <div class="my-10 px-4 text-center">
      <p class="fun text-lg">
        Made just for fun!
      </p>
      <p class="fun_desc text-sm text-gray-600 mx-auto max-w-2xl dark:text-gray-400">
        I could have made it a lot better, but I think this is good enough to play with. :)
        <br>Besides, I was just experimenting with Nuxt 3 / Vue 3 and wanted a cool idea with smaller interactions.
        <br>This is primarily designed for desktop.
        If an algorithm is devised for plotting the nodes based on the actual mission time, then a whole lot of other
        features such as zoom in/out the timeline and few more interactions can be added.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles for page-specific elements, complementing UnoCSS */
.card {
  /* Base styles from original, UnoCSS can override/extend */
  /* transition: color 0.15s ease, border-color 0.15s ease; */
  /* hover:text-blue-500 hover:border-blue-500 focus:text-blue-500 focus:border-blue-500 */
  /* dark:border-gray-700 */
}

.card h2 {
  /* margin: 0 0 1rem 0; */
  /* uno: mb-4 */
  /* font-size: 1rem; */
  /* uno: text-base or text-lg */
}

.input-field {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-offset-gray-900 dark:focus:border-indigo-400;
}

.btn-action {
  @apply px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:ring-2 focus:ring-offset-2;
}

.btn-action:disabled {
  @apply bg-gray-300 dark:bg-gray-700 cursor-not-allowed;
}

/* Styling for fun text, can be UnoCSS too */
.fun {
  /* font-size: 16px; line-height: 1.5; */
}

.fun_desc {
  /* font-size: 14px; line-height: 1.5; width: 60%; margin: 0 auto; */
}
</style>
