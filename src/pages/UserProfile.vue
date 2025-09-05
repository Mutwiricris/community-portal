<template>
  <DashboardLayout>
    <div class="user-profile">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">User Profile</h1>
          <p class="text-gray-600">Manage your account settings and preferences</p>
        </div>
      </div>
      
      <!-- Profile Information -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Profile Card -->
        <div class="lg:col-span-1">
          <Card class="profile-card">
            <CardContent class="text-center p-6">
              <div class="mb-4">
                <Avatar class="w-20 h-20 mx-auto mb-4">
                  <AvatarFallback class="text-2xl font-semibold">
                    {{ userStore.user?.displayName?.charAt(0) || '?' }}
                  </AvatarFallback>
                </Avatar>
                <h3 class="text-xl font-semibold text-gray-800 mb-1">
                  {{ userStore.user?.displayName || 'Unknown User' }}
                </h3>
                <p class="text-gray-600 mb-2">{{ userStore.user?.email }}</p>
                <Badge variant="secondary">
                  {{ userStore.user?.userType || 'member' }}
                </Badge>
              </div>
              
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Member since:</span>
                  <span class="font-medium">{{ formatDate(userStore.user?.createdAt) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Last updated:</span>
                  <span class="font-medium">{{ formatDate(userStore.user?.updatedAt) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Status:</span>
                  <Badge variant="outline" class="bg-green-50 text-green-700 border-green-200">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <!-- Profile Form -->
        <div class="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <form @submit.prevent="handleUpdateProfile" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      v-model="profileForm.displayName"
                      placeholder="Enter your display name"
                      :class="{ 'border-red-500': errors.displayName }"
                    />
                    <small v-if="errors.displayName" class="text-red-500 text-sm">{{ errors.displayName }}</small>
                  </div>
                  
                  <div class="space-y-2">
                    <Label for="email">Email Address</Label>
                    <Input
                      id="email"
                      v-model="profileForm.email"
                      placeholder="Enter your email"
                      disabled
                    />
                    <small class="text-gray-500 text-sm">Email cannot be changed</small>
                  </div>
                </div>
                
                <div class="space-y-2">
                  <Label for="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    v-model="profileForm.bio"
                    placeholder="Tell us about yourself"
                    rows="4"
                  />
                </div>
                
                <Separator />
                
                <div class="space-y-4">
                  <Label class="text-base font-medium">Notification Preferences</Label>
                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="space-y-0.5">
                        <Label class="text-base">Email Notifications</Label>
                        <p class="text-sm text-muted-foreground">Receive updates about your communities</p>
                      </div>
                      <Switch
                        v-model:checked="profileForm.emailNotifications"
                      />
                    </div>
                    
                    <div class="flex items-center justify-between">
                      <div class="space-y-0.5">
                        <Label class="text-base">Community Updates</Label>
                        <p class="text-sm text-muted-foreground">Get notified about new members and activities</p>
                      </div>
                      <Switch
                        v-model:checked="profileForm.communityUpdates"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button"
                    variant="outline"
                    @click="resetForm"
                  >
                    Reset
                  </Button>
                  <Button 
                    type="submit"
                    :disabled="isLoading"
                  >
                    <span v-if="isLoading" class="mr-2">⏳</span>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <!-- Account Actions -->
      <div class="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account security and preferences</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-700">Change Password</h3>
                <p class="text-sm text-gray-500">Update your account password</p>
              </div>
              <Button 
                variant="outline"
                @click="showPasswordDialog = true"
              >
                Change Password
              </Button>
            </div>
            
            <Separator />
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-gray-700">Download Data</h3>
                <p class="text-sm text-gray-500">Export your account data</p>
              </div>
              <Button 
                variant="outline"
                @click="exportUserData"
              >
                Export Data
              </Button>
            </div>
            
            <Separator />
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium text-red-600">Delete Account</h3>
                <p class="text-sm text-gray-500">Permanently delete your account and all data</p>
              </div>
              <Button 
                variant="destructive"
                @click="confirmDeleteAccount"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <!-- Change Password Dialog -->
      <Dialog v-model:open="showPasswordDialog">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form @submit.prevent="handleChangePassword" class="space-y-4">
            <div class="space-y-2">
              <Label for="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="Enter current password"
                :class="{ 'border-red-500': errors.currentPassword }"
                required
              />
              <small v-if="errors.currentPassword" class="text-red-500 text-sm">{{ errors.currentPassword }}</small>
            </div>
            
            <div class="space-y-2">
              <Label for="newPassword">New Password</Label>
              <Input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="Enter new password"
                :class="{ 'border-red-500': errors.newPassword }"
                required
              />
              <small v-if="errors.newPassword" class="text-red-500 text-sm">{{ errors.newPassword }}</small>
            </div>
            
            <div class="space-y-2">
              <Label for="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="Confirm new password"
                :class="{ 'border-red-500': errors.confirmPassword }"
                required
              />
              <small v-if="errors.confirmPassword" class="text-red-500 text-sm">{{ errors.confirmPassword }}</small>
            </div>
            
            <DialogFooter>
              <Button 
                type="button"
                variant="outline"
                @click="showPasswordDialog = false"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                :disabled="isLoading"
              >
                <span v-if="isLoading" class="mr-2">⏳</span>
                Change Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const userStore = useUserStore()

const showPasswordDialog = ref(false)
const isLoading = ref(false)

const profileForm = ref({
  displayName: '',
  email: '',
  bio: '',
  emailNotifications: true,
  communityUpdates: true
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({
  displayName: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const formatDate = (date: Date | undefined) => {
  if (!date) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

const resetForm = () => {
  if (userStore.user) {
    profileForm.value = {
      displayName: userStore.user.displayName || '',
      email: userStore.user.email || '',
      bio: userStore.user.bio || '',
      emailNotifications: userStore.user.emailNotifications !== false,
      communityUpdates: userStore.user.communityUpdates !== false
    }
  }
}

const handleUpdateProfile = async () => {
  errors.value = {
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  if (!profileForm.value.displayName.trim()) {
    errors.value.displayName = 'Display name is required'
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await userStore.updateProfile({
      displayName: profileForm.value.displayName.trim(),
      bio: profileForm.value.bio.trim(),
      emailNotifications: profileForm.value.emailNotifications,
      communityUpdates: profileForm.value.communityUpdates
    })
    
    if (result.success) {
      console.log('Profile updated successfully')
    } else {
      console.error('Failed to update profile:', result.error)
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error)
  } finally {
    isLoading.value = false
  }
}

const handleChangePassword = async () => {
  errors.value = {
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  
  if (!passwordForm.value.currentPassword) {
    errors.value.currentPassword = 'Current password is required'
    return
  }
  
  if (!passwordForm.value.newPassword) {
    errors.value.newPassword = 'New password is required'
    return
  }
  
  if (passwordForm.value.newPassword.length < 6) {
    errors.value.newPassword = 'Password must be at least 6 characters'
    return
  }
  
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await userStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )
    
    if (result.success) {
      showPasswordDialog.value = false
      passwordForm.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
      console.log('Password changed successfully')
    } else {
      console.error('Failed to change password:', result.error)
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error)
  } finally {
    isLoading.value = false
  }
}

const exportUserData = async () => {
  const result = await userStore.exportUserData()
  if (result.success) {
    console.log('Data exported successfully')
  } else {
    console.error('Failed to export data:', result.error)
  }
}

const confirmDeleteAccount = async () => {
  if (confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.')) {
    const result = await userStore.deleteAccount()
    if (result.success) {
      console.log('Account deleted successfully')
    } else {
      console.error('Failed to delete account:', result.error)
    }
  }
}

onMounted(() => {
  resetForm()
})
</script>

<style scoped>
.profile-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.profile-card :deep(.card-content) {
  padding: 0;
}
</style>