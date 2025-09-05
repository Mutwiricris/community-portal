<template>
  <Button
    variant="ghost"
    size="sm"
    @click="sidebar?.toggleSidebar"
    :class="cn('h-8 w-8 p-0', $attrs.class)"
  >
    <PanelLeftClose v-if="isCollapsed" class="h-4 w-4" />
    <PanelLeft v-else class="h-4 w-4" />
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { PanelLeft, PanelLeftClose } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
import { cn } from '@/lib/utils'

const sidebar = inject('sidebar') as any
const isCollapsed = computed(() => sidebar?.isCollapsed?.value || false)
</script>