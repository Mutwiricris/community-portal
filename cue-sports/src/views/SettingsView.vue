<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Settings</h1>
        <p class="text-muted-foreground">
          Manage your application settings and preferences
        </p>
      </div>
    </div>

    <!-- Settings Grid -->
    <div class="grid gap-6 md:grid-cols-2">
      <!-- Account Settings -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <User class="mr-2 h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <label class="text-sm font-medium">Display Name</label>
            <Input v-model="settings.displayName" placeholder="Your display name" />
          </div>
          <div>
            <label class="text-sm font-medium">Email</label>
            <Input v-model="settings.email" placeholder="your@email.com" disabled />
          </div>
          <Button class="w-full">Update Account</Button>
        </CardContent>
      </Card>

      <!-- App Preferences -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Settings class="mr-2 h-5 w-5" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Dark Mode</span>
            <input 
              type="checkbox" 
              v-model="settings.darkMode"
              class="rounded"
            />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Email Notifications</span>
            <input 
              type="checkbox" 
              v-model="settings.emailNotifications"
              class="rounded"
            />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Auto-save</span>
            <input 
              type="checkbox" 
              v-model="settings.autoSave"
              class="rounded"
            />
          </div>
          <Button class="w-full">Save Preferences</Button>
        </CardContent>
      </Card>

      <!-- Security -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Shield class="mr-2 h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <Button variant="outline" class="w-full">Change Password</Button>
          <Button variant="outline" class="w-full">Two-Factor Authentication</Button>
          <Button variant="destructive" class="w-full">Logout All Devices</Button>
        </CardContent>
      </Card>

      <!-- System -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center">
            <Monitor class="mr-2 h-5 w-5" />
            System
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span>Version:</span>
              <span class="font-mono">1.0.0</span>
            </div>
            <div class="flex justify-between">
              <span>Last Update:</span>
              <span>2024-03-15</span>
            </div>
            <div class="flex justify-between">
              <span>Database:</span>
              <span class="text-green-600">Connected</span>
            </div>
          </div>
          <Button variant="outline" class="w-full">Check for Updates</Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Settings, Shield, Monitor } from 'lucide-vue-next'
import Card from '@/components/ui/card.vue'
import CardHeader from '@/components/ui/card-header.vue'
import CardTitle from '@/components/ui/card-title.vue'
import CardContent from '@/components/ui/card-content.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'

const settings = ref({
  displayName: 'Admin User',
  email: 'admin@example.com',
  darkMode: false,
  emailNotifications: true,
  autoSave: true
})
</script>