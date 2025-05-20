<script setup lang="ts">
// components/layout/NavItem.vue
interface NavItemProps {
  href: string
  caption: string
}
defineProps<NavItemProps>()
</script>

<template>
  <NuxtLink
    :to="href"
    class="text-sm font-medium px-3 py-2 rounded-md active:text-blue-500 focus:text-blue-500 hover:text-blue-500"
  >
    {{ caption }}
  </NuxtLink>
</template>
