<template>
  <DashboardLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">Settings</h1>
        <p class="text-gray-600 mt-1">Manage your account and community preferences</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- Settings Sidebar -->
        <div class="lg:col-span-1">
          <Card>
            <CardContent class="p-0">
              <nav class="space-y-1">
                <button
                  v-for="section in settingSections"
                  :key="section.id"
                  @click="activeSection = section.id"
                  class="w-full flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  :class="{
                    'bg-blue-50 border-r-2 border-blue-500 text-blue-700': activeSection === section.id,
                    'text-gray-700': activeSection !== section.id
                  }"
                >
                  <component :is="section.icon" class="h-5 w-5 mr-3" />
                  {{ section.name }}
                </button>
              </nav>
            </CardContent>
          </Card>
        </div>

        <!-- Settings Content -->
        <div class="lg:col-span-3">
          <!-- General Settings -->
          <div v-if="activeSection === 'general'">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div>
                  <label class="text-sm font-medium text-gray-700">Display Name</label>
                  <Input 
                    v-model="settings.displayName" 
                    class="mt-1"
                    placeholder="Your display name"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium text-gray-700">Email</label>
                  <Input 
                    v-model="settings.email" 
                    type="email"
                    class="mt-1"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium text-gray-700">Bio</label>
                  <Textarea 
                    v-model="settings.bio" 
                    class="mt-1"
                    placeholder="Tell us about yourself..."
                    rows="3"
                  />
                </div>
                
                <div>
                  <label class="text-sm font-medium text-gray-700">Language</label>
                  <select class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Community Settings -->
          <div v-if="activeSection === 'community'">
            <Card>
              <CardHeader>
                <CardTitle>Community Settings</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Auto-approve new members</h3>
                    <p class="text-sm text-gray-500">Automatically approve member join requests</p>
                  </div>
                  <Switch v-model="settings.autoApprove" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Public community profile</h3>
                    <p class="text-sm text-gray-500">Make your community visible to everyone</p>
                  </div>
                  <Switch v-model="settings.publicProfile" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Allow member invitations</h3>
                    <p class="text-sm text-gray-500">Let members invite their friends</p>
                  </div>
                  <Switch v-model="settings.memberInvitations" />
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Notifications -->
          <div v-if="activeSection === 'notifications'">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Email notifications</h3>
                    <p class="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch v-model="settings.emailNotifications" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Tournament updates</h3>
                    <p class="text-sm text-gray-500">Get notified about tournament changes</p>
                  </div>
                  <Switch v-model="settings.tournamentUpdates" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Community messages</h3>
                    <p class="text-sm text-gray-500">Notifications for community announcements</p>
                  </div>
                  <Switch v-model="settings.communityMessages" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Member activity</h3>
                    <p class="text-sm text-gray-500">Updates about member joins and activity</p>
                  </div>
                  <Switch v-model="settings.memberActivity" />
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Privacy Settings -->
          <div v-if="activeSection === 'privacy'">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Show profile to members</h3>
                    <p class="text-sm text-gray-500">Let community members see your profile</p>
                  </div>
                  <Switch v-model="settings.showProfile" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Show activity status</h3>
                    <p class="text-sm text-gray-500">Display when you're online</p>
                  </div>
                  <Switch v-model="settings.showActivity" />
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Allow direct messages</h3>
                    <p class="text-sm text-gray-500">Let other members send you private messages</p>
                  </div>
                  <Switch v-model="settings.allowMessages" />
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Security Settings -->
          <div v-if="activeSection === 'security'">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent class="space-y-6">
                <div>
                  <h3 class="text-sm font-medium text-gray-700 mb-2">Change Password</h3>
                  <div class="space-y-3">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" />
                    <Button>Update Password</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Two-factor authentication</h3>
                    <p class="text-sm text-gray-500">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
                
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-gray-700">Session management</h3>
                    <p class="text-sm text-gray-500">View and manage active sessions</p>
                  </div>
                  <Button variant="outline">Manage Sessions</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end space-x-3 mt-6">
            <Button variant="outline" @click="resetSettings">Reset</Button>
            <Button @click="saveSettings">Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Settings,
  Users,
  Bell,
  Shield,
  Lock
} from 'lucide-vue-next'

const authStore = useAuthStore()
const activeSection = ref('general')

const settingSections = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'community', name: 'Community', icon: Users },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'privacy', name: 'Privacy', icon: Shield },
  { id: 'security', name: 'Security', icon: Lock }
]

const settings = ref({
  displayName: authStore.user?.displayName || '',
  email: authStore.user?.email || '',
  bio: authStore.user?.bio || '',
  autoApprove: true,
  publicProfile: false,
  memberInvitations: true,
  emailNotifications: true,
  tournamentUpdates: true,
  communityMessages: true,
  memberActivity: false,
  showProfile: true,
  showActivity: true,
  allowMessages: true
})

const saveSettings = async () => {
  try {
    await authStore.updateUserProfile({
      displayName: settings.value.displayName,
      bio: settings.value.bio
    })
    // TODO: Save other settings to backend
    console.log('Settings saved:', settings.value)
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

const resetSettings = () => {
  settings.value = {
    displayName: authStore.user?.displayName || '',
    email: authStore.user?.email || '',
    bio: authStore.user?.bio || '',
    autoApprove: true,
    publicProfile: false,
    memberInvitations: true,
    emailNotifications: true,
    tournamentUpdates: true,
    communityMessages: true,
    memberActivity: false,
    showProfile: true,
    showActivity: true,
    allowMessages: true
  }
}
</script>