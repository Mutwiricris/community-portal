<template>
  <div class="space-y-6 p-3">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <LoadingSpinner />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8 text-red-600">
      <p>{{ error }}</p>
      <Button @click="$router.back()" variant="outline" class="mt-4">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>

    <!-- Community Details -->
    <div v-else-if="community" class="space-y-8">
      <!-- Header Section -->
      <div class="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <Button @click="$router.back()" variant="outline" size="sm">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Communities
          </Button>
          <div class="flex gap-2">
            <Button @click="editCommunity" variant="outline" size="sm">
              <Edit class="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button @click="refreshData" variant="outline" size="sm" :disabled="refreshing">
              <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': refreshing }" />
              Refresh
            </Button>
          </div>
        </div>

        <div class="flex items-center space-x-6">
          <div class="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-3xl">
            {{ community.initials }}
          </div>
          <div class="flex-1">
            <h1 class="text-3xl font-bold mb-2">{{ community.name }}</h1>
            <p class="text-lg text-muted-foreground mb-2">{{ community.location }}, {{ community.county }}</p>
            <p class="text-muted-foreground">{{ community.description }}</p>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ community.memberCount || 0 }}</div>
            <div class="text-sm text-muted-foreground">Members</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-green-600">{{ community.adminIds?.length || 0 }}</div>
            <div class="text-sm text-muted-foreground">Admins</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-purple-600">{{ community.followerCount || 0 }}</div>
            <div class="text-sm text-muted-foreground">Followers</div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-orange-600">{{ community.tags?.length || 0 }}</div>
            <div class="text-sm text-muted-foreground">Tags</div>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="community.tags && community.tags.length > 0" class="mt-4">
          <div class="flex flex-wrap gap-2">
            <Badge v-for="tag in community.tags" :key="tag" variant="secondary">
              {{ tag }}
            </Badge>
          </div>
        </div>
      </div>

      <!-- Tabs for Members and Admins -->
      <div class="border-b">
        <nav class="flex space-x-8">
          <button
            @click="activeTab = 'admins'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'admins'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            ]"
          >
            Admins ({{ admins.length }})
          </button>
          <button
            @click="activeTab = 'members'"
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            ]"
          >
            Members ({{ members.length }})
          </button>
        </nav>
      </div>

      <!-- Admins Tab Content -->
      <div v-if="activeTab === 'admins'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Community Administrators</h2>
          <Button @click="manageAdmins" :disabled="(community.adminIds?.length || 0) >= 2">
            <UserPlus class="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </div>

        <div v-if="loadingAdmins" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>

        <div v-else-if="admins.length === 0" class="text-center py-12">
          <Crown class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 class="text-lg font-medium mb-2">No Administrators</h3>
          <p class="text-muted-foreground mb-4">This community doesn't have any administrators yet.</p>
          <Button @click="manageAdmins" variant="outline">
            <UserPlus class="h-4 w-4 mr-2" />
            Assign First Admin
          </Button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UserDetailCard
            v-for="admin in admins"
            :key="admin.uid"
            :user="admin"
            :role="'Community Admin'"
            @view-details="viewUserDetails(admin)"
            @remove="removeAdmin(admin.uid)"
            :can-remove="true"
          />
        </div>
      </div>

      <!-- Members Tab Content -->
      <div v-if="activeTab === 'members'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Community Members</h2>
          <div class="flex gap-2">
            <Input
              v-model="memberSearchQuery"
              placeholder="Search members..."
              class="w-64"
            />
            <Button @click="manageMembers">
              <UserPlus class="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        <div v-if="loadingMembers" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>

        <div v-else-if="filteredMembers.length === 0 && !memberSearchQuery" class="text-center py-12">
          <Users class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 class="text-lg font-medium mb-2">No Members</h3>
          <p class="text-muted-foreground mb-4">This community doesn't have any members yet.</p>
          <Button @click="manageMembers" variant="outline">
            <UserPlus class="h-4 w-4 mr-2" />
            Add First Member
          </Button>
        </div>

        <div v-else-if="filteredMembers.length === 0 && memberSearchQuery" class="text-center py-12">
          <Search class="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 class="text-lg font-medium mb-2">No Results</h3>
          <p class="text-muted-foreground">No members found matching "{{ memberSearchQuery }}"</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UserDetailCard
            v-for="member in filteredMembers"
            :key="member.uid"
            :user="member"
            :role="isAdmin(member.uid) ? 'Community Admin' : 'Member'"
            @view-details="viewUserDetails(member)"
            @remove="removeMember(member.uid)"
            :can-remove="!isAdmin(member.uid)"
          />
        </div>
      </div>
    </div>

    <!-- User Details Modal -->
    <UserDetailsModal
      v-if="selectedUser"
      :user="selectedUser"
      :open="showUserModal"
      @close="closeUserModal"
    />

    <!-- Community Edit Modal -->
    <CommunityDetails
      v-if="community"
      :community="community"
      :open="showEditModal"
      @close="closeEditModal"
      @updated="handleCommunityUpdated"
    />

    <!-- Admin Management Modal -->
    <AdminManagement
      v-if="community"
      :community="community"
      :open="showAdminModal"
      @close="closeAdminModal"
      @updated="handleCommunityUpdated"
    />

    <!-- Member Management Modal -->
    <MemberManagement
      v-if="community"
      :community="community"
      :open="showMemberModal"
      @close="closeMemberModal"
      @updated="handleCommunityUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  ArrowLeft, 
  Edit, 
  RefreshCw, 
  UserPlus, 
  Crown, 
  Users, 
  Search 
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { getDoc, formatTimestamp } from '@/utils/firestore'
import type { Community } from '@/types/community'
import type { UserProfile } from '@/composables/useAuth'

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UserDetailCard from '@/components/communities/UserDetailCard.vue'
import UserDetailsModal from '@/components/communities/UserDetailsModal.vue'
import CommunityDetails from '@/components/communities/CommunityDetails.vue'
import AdminManagement from '@/components/communities/AdminManagement.vue'
import MemberManagement from '@/components/communities/MemberManagement.vue'

// UI Components
import Button from '@/components/ui/button.vue'
import Badge from '@/components/ui/badge.vue'
import Input from '@/components/ui/input.vue'

const route = useRoute()
const router = useRouter()
const { success, error: showError } = useToast()

// State
const community = ref<(Community & { id: string }) | null>(null)
const admins = ref<UserProfile[]>([])
const members = ref<UserProfile[]>([])
const loading = ref(true)
const loadingAdmins = ref(false)
const loadingMembers = ref(false)
const refreshing = ref(false)
const error = ref<string | null>(null)

// Tab and search state
const activeTab = ref<'admins' | 'members'>('admins')
const memberSearchQuery = ref('')

// Modal state
const selectedUser = ref<UserProfile | null>(null)
const showUserModal = ref(false)
const showEditModal = ref(false)
const showAdminModal = ref(false)
const showMemberModal = ref(false)

// Computed
const communityId = computed(() => route.params.id as string)

const filteredMembers = computed(() => {
  if (!memberSearchQuery.value.trim()) return members.value
  
  const query = memberSearchQuery.value.toLowerCase()
  return members.value.filter(member => 
    member.displayName.toLowerCase().includes(query) ||
    member.email.toLowerCase().includes(query)
  )
})

// Methods
const loadCommunity = async () => {
  try {
    loading.value = true
    error.value = null

    const communityData = await getDoc('communities', communityId.value)
    if (!communityData) {
      error.value = 'Community not found'
      return
    }

    community.value = {
      ...communityData,
      // Ensure required arrays exist with defaults
      adminIds: communityData.adminIds || [],
      members_id: communityData.members_id || [],
      followers: communityData.followers || [],
      tags: communityData.tags || [],
      memberCount: communityData.memberCount || 0,
      followerCount: communityData.followerCount || 0
    } as Community & { id: string }

    // Load admins and members
    await Promise.all([loadAdmins(), loadMembers()])
  } catch (err) {
    console.error('Error loading community:', err)
    error.value = 'Failed to load community details'
    showError('Error', 'Failed to load community details')
  } finally {
    loading.value = false
  }
}

const loadAdmins = async () => {
  if (!community.value || !community.value.adminIds?.length) {
    admins.value = []
    return
  }

  try {
    loadingAdmins.value = true
    const adminProfiles: UserProfile[] = []

    for (const adminId of community.value.adminIds) {
      try {
        const adminData = await getDoc('users', adminId)
        if (adminData) {
          adminProfiles.push({
            uid: adminId,
            email: adminData.email,
            displayName: adminData.displayName,
            role: adminData.role,
            userType: adminData.userType,
            geographicalContext: adminData.geographicalContext,
            updatedAt: adminData.updatedAt?.toDate ? adminData.updatedAt.toDate() : new Date(adminData.updatedAt)
          } as UserProfile)
        }
      } catch (error) {
        console.error(`Error loading admin ${adminId}:`, error)
      }
    }

    admins.value = adminProfiles
  } catch (error) {
    console.error('Error loading admins:', error)
    showError('Error', 'Failed to load community administrators')
  } finally {
    loadingAdmins.value = false
  }
}

const loadMembers = async () => {
  if (!community.value || !community.value.members_id?.length) {
    members.value = []
    return
  }

  try {
    loadingMembers.value = true
    const memberProfiles: UserProfile[] = []

    for (const memberId of community.value.members_id) {
      try {
        const memberData = await getDoc('users', memberId)
        if (memberData) {
          memberProfiles.push({
            uid: memberId,
            email: memberData.email,
            displayName: memberData.displayName,
            role: memberData.role,
            userType: memberData.userType,
            geographicalContext: memberData.geographicalContext,
            updatedAt: memberData.updatedAt?.toDate ? memberData.updatedAt.toDate() : new Date(memberData.updatedAt)
          } as UserProfile)
        }
      } catch (error) {
        console.error(`Error loading member ${memberId}:`, error)
      }
    }

    members.value = memberProfiles
  } catch (error) {
    console.error('Error loading members:', error)
    showError('Error', 'Failed to load community members')
  } finally {
    loadingMembers.value = false
  }
}

const refreshData = async () => {
  refreshing.value = true
  await loadCommunity()
  refreshing.value = false
  success('Success', 'Community data refreshed')
}

const isAdmin = (userId: string) => {
  return community.value?.adminIds?.includes(userId) || false
}

// Modal handlers
const viewUserDetails = (user: UserProfile) => {
  selectedUser.value = user
  showUserModal.value = true
}

const closeUserModal = () => {
  showUserModal.value = false
  selectedUser.value = null
}

const editCommunity = () => {
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
}

const manageAdmins = () => {
  showAdminModal.value = true
}

const closeAdminModal = () => {
  showAdminModal.value = false
}

const manageMembers = () => {
  showMemberModal.value = true
}

const closeMemberModal = () => {
  showMemberModal.value = false
}

const handleCommunityUpdated = async () => {
  await loadCommunity()
  success('Success', 'Community updated successfully')
}

const removeAdmin = async (userId: string) => {
  // This will be handled by the AdminManagement modal
  manageAdmins()
}

const removeMember = async (userId: string) => {
  // This will be handled by the MemberManagement modal
  manageMembers()
}

// Lifecycle
onMounted(() => {
  loadCommunity()
})

// Watch for route changes
watch(() => route.params.id, (newId) => {
  if (newId && newId !== communityId.value) {
    loadCommunity()
  }
})
</script>