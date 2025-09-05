<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <label for="firstName" class="text-sm font-medium">First Name *</label>
        <Input
          id="firstName"
          v-model="form.firstName"
          placeholder="Enter first name"
          required
        />
      </div>

      <div class="space-y-2">
        <label for="lastName" class="text-sm font-medium">Last Name *</label>
        <Input
          id="lastName"
          v-model="form.lastName"
          placeholder="Enter last name"
          required
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <label for="email" class="text-sm font-medium">Email *</label>
        <Input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="Enter email address"
          required
        />
      </div>

      <div class="space-y-2">
        <label for="phone" class="text-sm font-medium">Phone</label>
        <Input
          id="phone"
          v-model="form.phone"
          type="tel"
          placeholder="Enter phone number"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="space-y-2">
        <label for="dateOfBirth" class="text-sm font-medium">Date of Birth</label>
        <Input
          id="dateOfBirth"
          v-model="form.dateOfBirth"
          type="date"
        />
      </div>

      <div class="space-y-2">
        <label for="skill" class="text-sm font-medium">Skill Level</label>
        <select
          id="skill"
          v-model="form.skill"
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select skill level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="professional">Professional</option>
        </select>
      </div>

      <div class="space-y-2">
        <label for="rank" class="text-sm font-medium">Rank</label>
        <Input
          id="rank"
          v-model.number="form.rank"
          type="number"
          min="1"
          placeholder="Player rank"
        />
      </div>
    </div>

    <div class="space-y-2">
      <label for="communityId" class="text-sm font-medium">Community *</label>
      <CommunitySelect
        id="communityId"
        v-model="form.communityId"
        :error="communityError"
        required
      />
      <p v-if="communityError" class="text-sm text-red-600">{{ communityError }}</p>
    </div>

    <div class="space-y-2">
      <label for="status" class="text-sm font-medium">Status</label>
      <select
        id="status"
        v-model="form.status"
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <!-- Stats Section (only shown when editing) -->
    <div v-if="isEdit" class="space-y-4">
      <h3 class="text-lg font-medium">Player Statistics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="space-y-2">
          <label for="matchesPlayed" class="text-sm font-medium">Matches Played</label>
          <Input
            id="matchesPlayed"
            v-model.number="form.stats.matchesPlayed"
            type="number"
            min="0"
          />
        </div>

        <div class="space-y-2">
          <label for="matchesWon" class="text-sm font-medium">Matches Won</label>
          <Input
            id="matchesWon"
            v-model.number="form.stats.matchesWon"
            type="number"
            min="0"
            :max="form.stats.matchesPlayed"
          />
        </div>

        <div class="space-y-2">
          <label for="tournamentsPlayed" class="text-sm font-medium">Tournaments Played</label>
          <Input
            id="tournamentsPlayed"
            v-model.number="form.stats.tournamentsPlayed"
            type="number"
            min="0"
          />
        </div>

        <div class="space-y-2">
          <label for="tournamentsWon" class="text-sm font-medium">Tournaments Won</label>
          <Input
            id="tournamentsWon"
            v-model.number="form.stats.tournamentsWon"
            type="number"
            min="0"
            :max="form.stats.tournamentsPlayed"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <label for="totalEarnings" class="text-sm font-medium">Total Earnings ($)</label>
          <Input
            id="totalEarnings"
            v-model.number="form.stats.totalEarnings"
            type="number"
            min="0"
            step="0.01"
          />
        </div>

        <div class="space-y-2">
          <label for="currentStreak" class="text-sm font-medium">Current Streak</label>
          <Input
            id="currentStreak"
            v-model.number="form.stats.currentStreak"
            type="number"
          />
        </div>

        <div class="space-y-2">
          <label for="bestStreak" class="text-sm font-medium">Best Streak</label>
          <Input
            id="bestStreak"
            v-model.number="form.stats.bestStreak"
            type="number"
            min="0"
          />
        </div>
      </div>
    </div>

    <div class="flex justify-end space-x-2">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        Cancel
      </Button>
      <Button type="submit" @click="handleSubmit" :disabled="loading">
        {{ loading ? 'Saving...' : (isEdit ? 'Update Player' : 'Create Player') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import { Player, defaultPlayerStats } from '@/types/player'
import Input from '@/components/ui/input.vue'
import Button from '@/components/ui/button.vue'
import CommunitySelect from '@/components/ui/community-select.vue'
import { useAuth } from '@/composables/useAuth'

interface Props {
  player?: Player & { id: string }
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<{
  submit: [data: Omit<Player, 'id' | 'createdAt' | 'updatedAt' | 'registrationDate'>]
  cancel: []
}>()

const isEdit = !!props.player
const { userProfile } = useAuth()
const communityError = ref('')

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  rank: '' as string | number,
  skill: '' as string | Player['skill'],
  status: 'active' as Player['status'],
  communityId: '',
  stats: { ...defaultPlayerStats }
})

// Initialize form if editing
if (props.player) {
  Object.assign(form, {
    ...props.player,
    dateOfBirth: props.player.dateOfBirth 
      ? new Date(props.player.dateOfBirth).toISOString().split('T')[0] 
      : '',
    stats: { ...props.player.stats }
  })
}

// Auto-calculate derived stats
watch([() => form.stats.matchesPlayed, () => form.stats.matchesWon], () => {
  if (form.stats.matchesPlayed > 0) {
    form.stats.matchesLost = form.stats.matchesPlayed - form.stats.matchesWon
    form.stats.winRate = Math.round((form.stats.matchesWon / form.stats.matchesPlayed) * 100)
  } else {
    form.stats.matchesLost = 0
    form.stats.winRate = 0
  }
})

const validateCommunityMembership = (): boolean => {
  communityError.value = ''
  
  if (!form.communityId) {
    communityError.value = 'Community selection is required'
    return false
  }
  
  // Verify user is admin or member of selected community
  const userCommunityId = userProfile.value?.geographicalContext?.community?.id
  if (!userCommunityId || userCommunityId !== form.communityId) {
    communityError.value = 'You can only register players in your own community'
    return false
  }
  
  return true
}

const handleSubmit = () => {
  if (!form.firstName || !form.lastName || !form.email) {
    return
  }

  // Validate community membership
  if (!validateCommunityMembership()) {
    return
  }

  const data = {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone?.trim() || undefined,
    dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : undefined,
    rank: (typeof form.rank === 'number' && form.rank > 0) ? form.rank : undefined,
    skill: form.skill || undefined,
    status: form.status,
    communityId: form.communityId,
    stats: form.stats,
    tournaments: props.player?.tournaments || []
  }

  emit('submit', data)
}
</script>