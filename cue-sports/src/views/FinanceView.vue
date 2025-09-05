<template>
  <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Finance</h1>
          <p class="text-muted-foreground">
            Track revenue, expenses, and financial performance
          </p>
        </div>
        <Button>
          <Plus class="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div class="text-center py-12">
        <DollarSign class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-medium mb-2">Finance Module</h3>
        <p class="text-muted-foreground mb-4">
          Financial management features will be implemented here
        </p>
        <div class="text-sm text-muted-foreground">
          Features: Revenue tracking, expense logging, financial reports, charts
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, DollarSign } from 'lucide-vue-next'
import Button from '@/components/ui/button.vue'
</script>