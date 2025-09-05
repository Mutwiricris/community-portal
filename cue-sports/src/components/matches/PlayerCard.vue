<template>
  <div
    :class="[
      'player-card border rounded-lg p-4 transition-all duration-200 cursor-pointer',
      {
        'border-blue-500 bg-blue-50': selected,
        'border-gray-200 hover:border-gray-300 hover:shadow-sm': !selected && !disabled,
        'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60': disabled
      }
    ]"
    @click="handleClick"
  >
    <!-- Player Header -->
    <div class="flex items-start gap-3 mb-3">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <div
          v-if="player.avatar"
          class="w-12 h-12 rounded-full bg-gray-200 overflow-hidden"
        >
          <img
            :src="player.avatar"
            :alt="player.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div
          v-else
          class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium"
        >
          {{ getInitials(player.name) }}
        </div>
      </div>

      <!-- Player Info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-medium text-gray-900 truncate">
          {{ player.name }}
        </h3>
        <p v-if="player.email" class="text-sm text-gray-600 truncate">
          {{ player.email }}
        </p>
        <p class="text-sm text-gray-500">
          {{ player.communityName }}
        </p>
      </div>

      <!-- Selection Indicator -->
      <div v-if="selected" class="flex-shrink-0">
        <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Player Stats -->
    <div class="grid grid-cols-2 gap-3 mb-3">
      <div class="text-center">
        <div class="text-lg font-semibold text-gray-900">
          {{ player.points }}
        </div>
        <div class="text-xs text-gray-500 uppercase tracking-wide">
          Points
        </div>
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-gray-900">
          {{ getPlayerRank() }}
        </div>
        <div class="text-xs text-gray-500 uppercase tracking-wide">
          Rank
        </div>
      </div>
    </div>

    <!-- Status Badges -->
    <div class="flex flex-wrap gap-2 mb-3">
      <!-- Registration Status -->
      <span
        :class="[
          'px-2 py-1 text-xs font-medium rounded-full',
          getRegistrationStatusClass()
        ]"
      >
        {{ getRegistrationStatusLabel() }}
      </span>

      <!-- Payment Status -->
      <span
        :class="[
          'px-2 py-1 text-xs font-medium rounded-full',
          getPaymentStatusClass()
        ]"
      >
        {{ getPaymentStatusLabel() }}
      </span>

      <!-- Eligibility -->
      <span
        v-if="!player.isEligible"
        class="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800"
        :title="player.eligibilityReason"
      >
        Not Eligible
      </span>
    </div>

    <!-- Additional Info -->
    <div v-if="showAdditionalInfo" class="text-xs text-gray-500 space-y-1">
      <div v-if="player.eligibilityReason && !player.isEligible">
        <strong>Issue:</strong> {{ player.eligibilityReason }}
      </div>
    </div>

    <!-- Action Hint -->
    <div v-if="!disabled" class="text-xs text-gray-400 mt-2 text-center">
      {{ selected ? 'Click to deselect' : 'Click to select' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MatchPlayer } from '@/composables/useMatchPlayers'

interface Props {
  player: MatchPlayer
  selected?: boolean
  disabled?: boolean
  showAdditionalInfo?: boolean
}

interface Emits {
  (e: 'select', player: MatchPlayer): void
  (e: 'deselect', playerId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  disabled: false,
  showAdditionalInfo: true
})

const emit = defineEmits<Emits>()

// Methods
const handleClick = () => {
  if (props.disabled) return
  
  if (props.selected) {
    emit('deselect', props.player.id)
  } else {
    emit('select', props.player)
  }
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getPlayerRank = (): string => {
  // This would calculate rank based on points or tournament performance
  // For now, return a placeholder
  return '#-'
}

const getRegistrationStatusClass = (): string => {
  const statusClasses = {
    'confirmed': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  return statusClasses[props.player.registrationStatus] || 'bg-gray-100 text-gray-800'
}

const getRegistrationStatusLabel = (): string => {
  const statusLabels = {
    'confirmed': 'Confirmed',
    'pending': 'Pending',
    'cancelled': 'Cancelled'
  }
  return statusLabels[props.player.registrationStatus] || 'Unknown'
}

const getPaymentStatusClass = (): string => {
  const statusClasses = {
    'paid': 'bg-green-100 text-green-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'failed': 'bg-red-100 text-red-800',
    'refunded': 'bg-gray-100 text-gray-800'
  }
  return statusClasses[props.player.paymentStatus] || 'bg-gray-100 text-gray-800'
}

const getPaymentStatusLabel = (): string => {
  const statusLabels = {
    'paid': 'Paid',
    'pending': 'Payment Pending',
    'failed': 'Payment Failed',
    'refunded': 'Refunded'
  }
  return statusLabels[props.player.paymentStatus] || 'Unknown'
}
</script>

<style scoped>
.player-card {
  @apply relative;
}

.player-card:hover:not(.opacity-60) {
  @apply transform scale-[1.02];
}
</style>