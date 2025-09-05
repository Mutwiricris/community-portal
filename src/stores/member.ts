import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Member } from '@/types'
import { useAuthStore } from './auth'
import { useCommunityStore } from './community'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const isLoading = ref(false)

  const fetchMembers = async (communityId?: string) => {
    const authStore = useAuthStore()
    const communityStore = useCommunityStore()
    
    if (!authStore.user) return { success: false, error: 'Not authenticated' }
    
    const targetCommunityId = communityId || communityStore.activeCommunity?.id
    if (!targetCommunityId) return { success: false, error: 'No community selected' }
    
    try {
      isLoading.value = true
      // Mock members data
      members.value = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          communityId: targetCommunityId,
          role: 'member',
          status: 'active',
          joinedAt: new Date('2024-01-20'),
          uid: 'user1',
          displayName: 'John Smith',
          photoURL: null
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@example.com',
          communityId: targetCommunityId,
          role: 'moderator',
          status: 'active',
          joinedAt: new Date('2024-02-05'),
          uid: 'user2',
          displayName: 'Sarah Johnson',
          photoURL: null
        }
      ]
      
      return { success: true }
    } catch (error: any) {
      console.error('Error fetching members:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const addMember = async (data: { email: string; role: string }) => {
    const authStore = useAuthStore()
    const communityStore = useCommunityStore()
    
    if (!authStore.user) return { success: false, error: 'Not authenticated' }
    if (!communityStore.activeCommunity) return { success: false, error: 'No community selected' }
    
    try {
      isLoading.value = true
      
      // Check if member already exists
      const existingMember = members.value.find(m => m.email === data.email)
      if (existingMember) {
        return { success: false, error: 'Member already exists in this community' }
      }
      
      const memberData = {
        id: Date.now().toString(),
        email: data.email,
        displayName: data.email.split('@')[0],
        name: data.email.split('@')[0],
        communityId: communityStore.activeCommunity.id,
        role: data.role as 'member' | 'moderator',
        status: 'pending' as const,
        joinedAt: new Date(),
        uid: '',
        photoURL: null
      }
      
      members.value.unshift(memberData)
      return { success: true, member: memberData }
    } catch (error: any) {
      console.error('Error adding member:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const updateMember = async (id: string, data: { role?: string; status?: string }) => {
    try {
      isLoading.value = true
      const updates = {
        ...data,
        updatedAt: new Date()
      }
      
      const index = members.value.findIndex(m => m.id === id)
      if (index !== -1) {
        members.value[index] = { ...members.value[index], ...updates }
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Error updating member:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const removeMember = async (id: string) => {
    try {
      isLoading.value = true
      members.value = members.value.filter(m => m.id !== id)
      return { success: true }
    } catch (error: any) {
      console.error('Error removing member:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const getMember = async (id: string) => {
    try {
      return members.value.find(m => m.id === id) || null
    } catch (error) {
      console.error('Error getting member:', error)
      return null
    }
  }

  const getMemberByEmail = (email: string) => {
    return members.value.find(m => m.email === email)
  }

  const getMembersByRole = (role: 'member' | 'moderator') => {
    return members.value.filter(m => m.role === role)
  }

  const getMembersByStatus = (status: 'active' | 'inactive' | 'pending') => {
    return members.value.filter(m => m.status === status)
  }

  const inviteMember = async (email: string, role: 'member' | 'moderator' = 'member') => {
    const authStore = useAuthStore()
    const communityStore = useCommunityStore()
    
    if (!authStore.user) return { success: false, error: 'Not authenticated' }
    if (!communityStore.activeCommunity) return { success: false, error: 'No community selected' }
    
    try {
      isLoading.value = true
      // TODO: Implement API call for member invitation
      return { success: true }
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      return { success: false, error: error.message }
    } finally {
      isLoading.value = false
    }
  }

  const getMemberStats = () => {
    return {
      totalMembers: members.value.length,
      activeMembers: members.value.filter(m => m.status === 'active').length,
      pendingMembers: members.value.filter(m => m.status === 'pending').length,
      moderators: members.value.filter(m => m.role === 'moderator').length
    }
  }

  const clearMembers = () => {
    members.value = []
  }

  return {
    members,
    isLoading,
    fetchMembers,
    addMember,
    updateMember,
    removeMember,
    getMember,
    getMemberByEmail,
    getMembersByRole,
    getMembersByStatus,
    inviteMember,
    getMemberStats,
    clearMembers
  }
})