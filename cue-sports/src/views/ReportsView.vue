<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Reports</h1>
        <p class="text-muted-foreground">
          Generate and download reports
        </p>
      </div>
      <Button>
        <Plus class="mr-2 h-4 w-4" />
        Create Custom Report
      </Button>
    </div>

    <!-- Quick Reports -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Quick Reports</h2>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card v-for="report in quickReports" :key="report.id" class="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent class="p-6">
            <div class="flex items-center mb-4">
              <component :is="report.icon" :class="['h-8 w-8 mr-3', report.color]" />
              <div>
                <h3 class="font-semibold">{{ report.title }}</h3>
                <p class="text-sm text-muted-foreground">{{ report.description }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <Button size="sm" variant="outline" class="flex-1">
                <Eye class="mr-2 h-3 w-3" />
                Preview
              </Button>
              <Button size="sm" class="flex-1">
                <Download class="mr-2 h-3 w-3" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Recent Reports -->
    <div>
      <h2 class="text-xl font-semibold mb-4">Recent Reports</h2>
      <Card>
        <CardContent class="p-0">
          <DataTable 
            :data="recentReports" 
            :columns="reportColumns"
            :searchable="true"
            empty-message="No reports generated yet"
          >
            <template #cell-status="{ value }">
              <Badge :variant="getStatusVariant(value)">{{ value }}</Badge>
            </template>
            <template #cell-actions="{ item }">
              <div class="flex gap-2">
                <Button size="sm" variant="outline" :disabled="item.status !== 'completed'">
                  <Download class="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" @click="deleteReport(item)">
                  <Trash2 class="h-3 w-3" />
                </Button>
              </div>
            </template>
          </DataTable>
        </CardContent>
      </Card>
    </div>

    <!-- Report Builder -->
    <Card>
      <CardHeader>
        <CardTitle>Custom Report Builder</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="text-sm font-medium mb-2 block">Report Type</label>
            <select v-model="customReport.type" class="w-full rounded-md border px-3 py-2">
              <option value="financial">Financial Report</option>
              <option value="player">Player Performance</option>
              <option value="tournament">Tournament Summary</option>
              <option value="inventory">Inventory Report</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium mb-2 block">Date Range</label>
            <select v-model="customReport.dateRange" class="w-full rounded-md border px-3 py-2">
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="last_year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
        <div>
          <label class="text-sm font-medium mb-2 block">Report Name</label>
          <Input v-model="customReport.name" placeholder="Enter report name" />
        </div>
        <div class="flex gap-2">
          <Button @click="generateReport" :disabled="!customReport.name">
            <FileText class="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button variant="outline" @click="scheduleReport">
            <Clock class="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Plus, 
  Eye, 
  Download, 
  Trash2,
  FileText,
  DollarSign,
  Users,
  Trophy,
  Package,
  Clock
} from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'
import { DataTable } from '@/components/common'

const quickReports = [
  {
    id: 1,
    title: 'Financial Summary',
    description: 'Revenue, expenses, and profit analysis',
    icon: DollarSign,
    color: 'text-green-600'
  },
  {
    id: 2,
    title: 'Player Statistics',
    description: 'Player performance and rankings',
    icon: Users,
    color: 'text-blue-600'
  },
  {
    id: 3,
    title: 'Tournament Report',
    description: 'Tournament results and statistics',
    icon: Trophy,
    color: 'text-yellow-600'
  },
  {
    id: 4,
    title: 'Inventory Report',
    description: 'Stock levels and product sales',
    icon: Package,
    color: 'text-purple-600'
  }
]

const reportColumns = [
  { key: 'name', title: 'Report Name' },
  { key: 'type', title: 'Type' },
  { key: 'created', title: 'Created' },
  { key: 'status', title: 'Status' },
  { key: 'actions', title: 'Actions' }
]

const recentReports = ref([
  {
    id: 1,
    name: 'March Financial Report',
    type: 'Financial',
    created: '2024-03-15 10:30',
    status: 'completed'
  },
  {
    id: 2,
    name: 'Player Performance Q1',
    type: 'Player Statistics',
    created: '2024-03-14 14:20',
    status: 'completed'
  },
  {
    id: 3,
    name: 'Tournament Analysis',
    type: 'Tournament',
    created: '2024-03-13 09:15',
    status: 'processing'
  }
])

const customReport = ref({
  type: 'financial',
  dateRange: 'last_month',
  name: ''
})

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'default'
    case 'processing': return 'secondary'
    case 'failed': return 'destructive'
    default: return 'outline'
  }
}

const generateReport = () => {
  console.log('Generating report:', customReport.value)
}

const scheduleReport = () => {
  console.log('Scheduling report:', customReport.value)
}

const deleteReport = (report: any) => {
  console.log('Deleting report:', report)
}
</script>