<template>
  <Dialog :open="open" @close="$emit('close')">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditing ? 'Edit Community' : (community ? 'Community Details' : 'Create Community') }}
        </DialogTitle>
      </DialogHeader>

      <div v-if="community && !isEditing" class="space-y-6">
        <!-- View Mode -->
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {{ community.initials }}
          </div>
          <div>
            <h2 class="text-2xl font-bold">{{ community.name }}</h2>
            <p class="text-muted-foreground">{{ community.location }}, {{ community.county }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-secondary/50 rounded p-3 text-center">
            <div class="text-2xl font-bold">{{ community.memberCount || 0 }}</div>
            <div class="text-sm text-muted-foreground">Members</div>
          </div>
          <div class="bg-blue-100 dark:bg-blue-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-blue-700 dark:text-blue-400">{{ community.followerCount || 0 }}</div>
            <div class="text-sm text-muted-foreground">Followers</div>
          </div>
          <div class="bg-green-100 dark:bg-green-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-green-700 dark:text-green-400">{{ community.adminIds?.length || 0 }}</div>
            <div class="text-sm text-muted-foreground">Admins</div>
          </div>
          <div class="bg-yellow-100 dark:bg-yellow-900/20 rounded p-3 text-center">
            <div class="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{{ community.tags?.length || 0 }}</div>
            <div class="text-sm text-muted-foreground">Tags</div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-semibold mb-2">Description</h3>
            <p class="text-muted-foreground">{{ community.description }}</p>
          </div>

          <div v-if="community.tags && community.tags.length > 0">
            <h3 class="text-lg font-semibold mb-2">Tags</h3>
            <div class="flex flex-wrap gap-2">
              <Badge v-for="tag in community.tags" :key="tag" variant="secondary">
                {{ tag }}
              </Badge>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 class="text-lg font-semibold mb-2">Activity</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Created:</span>
                  <span>{{ formatDate(community.createdAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Last Activity:</span>
                  <span>{{ formatDate(community.lastActivityAt) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Status:</span>
                  <Badge :variant="getActivityVariant()">{{ getActivityStatus() }}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-semibold mb-2">Location Details</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span>Location:</span>
                  <span>{{ community.location }}</span>
                </div>
                <div class="flex justify-between">
                  <span>County:</span>
                  <span>{{ community.county }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Admin User ID:</span>
                  <span class="font-mono text-xs">{{ community.adminUserId }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <Button variant="outline" @click="$emit('close')">Close</Button>
          <Button @click="startEditing">
            <Edit class="h-4 w-4 mr-2" />
            Edit Community
          </Button>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Edit/Create Mode -->
        <form @submit.prevent="saveCommunity" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Community Name *</label>
              <Input v-model="form.name" required placeholder="Enter community name" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Initials *</label>
              <Input v-model="form.initials" required placeholder="e.g., DP" maxlength="3" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Description *</label>
            <Textarea 
              v-model="form.description" 
              required 
              placeholder="Describe the community, its activities, and goals"
              rows="3"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Location *</label>
              <Input v-model="form.location" required placeholder="e.g., Downtown" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">County *</label>
              <CountySelect v-model="form.county" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Tags</label>
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge 
                v-for="(tag, index) in form.tags" 
                :key="index" 
                variant="secondary"
                class="cursor-pointer"
                @click="removeTag(index)"
              >
                {{ tag }} ×
              </Badge>
            </div>
            <div class="flex gap-2">
              <Input 
                v-model="newTag" 
                placeholder="Add a tag" 
                @keyup.enter="addTag"
              />
              <Button type="button" variant="outline" @click="addTag">Add</Button>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="cancelEditing">Cancel</Button>
            <Button type="submit" :disabled="!isFormValid || submitting">
              <LoadingSpinner v-if="submitting" class="h-4 w-4 mr-2" />
              {{ community ? 'Update Community' : 'Create Community' }}
            </Button>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Edit } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { addDoc, updateDoc, formatTimestamp } from '@/utils/firestore'
import type { Community, CreateCommunityData, UpdateCommunityData } from '@/types/community'

// Components
import Dialog from '@/components/ui/dialog.vue'
import DialogContent from '@/components/ui/dialog-content.vue'
import DialogHeader from '@/components/ui/dialog-header.vue'
import DialogTitle from '@/components/ui/dialog-title.vue'
import Button from '@/components/ui/button.vue'
import Input from '@/components/ui/input.vue'
import Textarea from '@/components/ui/textarea.vue'
import Badge from '@/components/ui/badge.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import CountySelect from '@/components/ui/county-select.vue'

interface Props {
  community?: (Community & { id: string }) | null
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

// State
const isEditing = ref(false)
const submitting = ref(false)
const newTag = ref('')

const form = reactive<CreateCommunityData & { tags: string[] }>({
  name: '',
  description: '',
  initials: '',
  location: '',
  county: '',
  tags: []
})

// Composables
const { success, error: showError } = useToast()

// Computed
const isFormValid = computed(() => {
  return form.name.trim() && 
         form.description.trim() && 
         form.initials.trim() && 
         form.location.trim() && 
         form.county.trim()
})

// Methods
const startEditing = () => {
  if (props.community) {
    Object.assign(form, {
      name: props.community.name,
      description: props.community.description,
      initials: props.community.initials,
      location: props.community.location,
      county: props.community.county,
      tags: [...props.community.tags]
    })
  }
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
  resetForm()
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    description: '',
    initials: '',
    location: '',
    county: '',
    tags: []
  })
  newTag.value = ''
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
    newTag.value = ''
  }
}

const removeTag = (index: number) => {
  form.tags.splice(index, 1)
}

const saveCommunity = async () => {
  if (!isFormValid.value) return

  try {
    submitting.value = true

    if (props.community) {
      // Update existing community
      const updateData: UpdateCommunityData = {
        name: form.name.trim(),
        description: form.description.trim(),
        initials: form.initials.trim().toUpperCase(),
        location: form.location.trim(),
        county: form.county.trim(),
        tags: form.tags
      }

      await updateDoc('communities', props.community.id, updateData)
      success('Success', 'Community updated successfully')
    } else {
      // Create new community
      const createData: CreateCommunityData & Partial<Community> = {
        ...form,
        initials: form.initials.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        county: form.county.trim(),
        logoUrl: null,
        adminIds: [],
        adminUserId: '',
        members_id: [],
        memberCount: 0,
        followers: [],
        followerCount: 0,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      }

      await addDoc('communities', createData)
      success('Success', 'Community created successfully')
    }

    emit('updated')
    emit('close')
    resetForm()
    isEditing.value = false
  } catch (error) {
    console.error('Error saving community:', error)
    showError('Error', 'Failed to save community')
  } finally {
    submitting.value = false
  }
}

const formatDate = (date: string | Date | any) => {
  const dateValue = formatTimestamp(date)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateValue)
}

const getActivityStatus = () => {
  if (!props.community) return 'Unknown'
  
  const lastActivity = formatTimestamp(props.community.lastActivityAt)
  const now = new Date()
  const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff <= 7) return 'Active'
  if (daysDiff <= 30) return 'Recent'
  return 'Inactive'
}

const getActivityVariant = () => {
  const status = getActivityStatus()
  return status === 'Active' ? 'success' : status === 'Recent' ? 'secondary' : 'outline'
}

// Watchers
watch(() => props.open, (newVal) => {
  if (!newVal) {
    isEditing.value = false
    resetForm()
  } else if (!props.community) {
    // Opening for create
    isEditing.value = true
  }
})
</script>