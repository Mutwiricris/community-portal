<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
      <component :is="icon" class="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div class="text-2xl font-bold">{{ value }}</div>
      <p class="text-xs text-muted-foreground">
        <span :class="changeClass">{{ changeText }}</span>
        from last month
      </p>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardContent from '@/components/ui/card-content.vue'
import CardTitle from '@/components/ui/card-title.vue'

interface Props {
  title: string
  value: string | number
  change: number
  icon: any
}

const props = defineProps<Props>()

const changeText = computed(() => {
  const sign = props.change >= 0 ? '+' : ''
  return `${sign}${props.change}%`
})

const changeClass = computed(() => 
  props.change >= 0 ? 'text-green-600' : 'text-red-600'
)
</script>