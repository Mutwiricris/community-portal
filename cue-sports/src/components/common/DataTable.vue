<template>
  <div class="w-full">
    <div class="flex items-center py-4">
      <Input
        v-if="searchable"
        placeholder="Search..."
        v-model="searchTerm"
        class="max-w-sm"
      />
    </div>
    <div class="rounded-md border">
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th
              v-for="column in columns"
              :key="column.key"
              class="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
            >
              {{ column.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in filteredData"
            :key="index"
            class="border-b hover:bg-muted/50"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="p-4 align-middle"
            >
              <slot :name="`cell-${column.key}`" :item="item" :value="item[column.key]">
                {{ item[column.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="filteredData.length === 0">
            <td :colspan="columns.length" class="h-24 text-center">
              <EmptyState :message="emptyMessage" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Input from '@/components/ui/input.vue'
import EmptyState from './EmptyState.vue'

interface Column {
  key: string
  title: string
}

interface Props {
  data: Record<string, any>[]
  columns: Column[]
  searchable?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  searchable: true,
  emptyMessage: 'No data available'
})

const searchTerm = ref('')

const filteredData = computed(() => {
  if (!props.searchable || !searchTerm.value) {
    return props.data
  }
  
  return props.data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.value.toLowerCase())
    )
  )
})
</script>