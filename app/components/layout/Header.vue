<script setup lang="ts">
// components/layout/Header.vue
// No specific script logic here
</script>

<template>
  <header class="py-[20px] flex content-between items-center">
    <div class="mr-auto py-[10px] w-[auto] sm:w-[30%]">
      <h1 class="text-xl font-bold md:text-2xl">
        <NuxtLink
          to="/"
          class="bg-gradient-to-b text-transparent from-blue-500 to-blue-700 bg-clip-text"
        >
          SpaceX Launch Timeline
        </NuxtLink>
      </h1>
    </div>
    <LayoutNavbar />
  </header>
</template>
