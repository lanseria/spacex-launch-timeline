// components/layout/Footer.vue
<script setup lang="ts">
// No script logic needed for this simple footer
</script>

<template>
  <footer class="dark_border_color py-8 border-t border-gray-200 flex flex-1 items-center justify-center dark:border-gray-700">
    <div class="mx-[30px]">
      <a
        class="text-sm text-gray-700 font-medium px-3 py-2 border border-transparent rounded-md bg-gray-100 inline-flex items-center justify-center dark:text-gray-300 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        href="https://github.com/HarishChaudhari/spacex-launch-timeline"
        rel="noopener noreferrer"
        target="_blank"
        aria-label="Follow @HarishChaudhari on GitHub"
      >
        <svg viewBox="0 0 16 16" width="16" height="16" class="octicon octicon-mark-github mr-2" aria-hidden="true">
          <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span>GitHub @HarishChaudhari</span>
      </a>
    </div>
    <a
      href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center justify-center"
    >
      Powered by{' '}
      <span class="dark_invert_img ml-1 h-[1em]">
        <!-- Using NuxtImg, ensure @nuxt/image is installed and configured -->
        <NuxtImg src="/vercel.svg" alt="Vercel Logo" width="72" height="16" />
        <!-- Or, if public/vercel.svg exists, plain img: -->
        <!-- <img src="/vercel.svg" alt="Vercel Logo" class="h-full" /> -->
      </span>
    </a>
  </footer>
</template>
