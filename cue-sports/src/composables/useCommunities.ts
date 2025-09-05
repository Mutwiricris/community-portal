import { ref } from 'vue'
import type { Community } from '@/types/community'
import { useFirestore } from './useFirestore'

export const useCommunities = () => {
  const {
    documents: communities,
    loading,
    error,
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe
  } = useFirestore<Community>('communities')

  const createCommunity = async (data: any) => await add(data)
  const updateCommunity = async (id: string, updates: any) => await update(id, updates)
  const deleteCommunity = async (id: string) => await remove(id)
  const getCommunity = async (id: string) => await getById(id)
  const getAllCommunities = async () => await getAll()

  // Helper methods for tournament form
  const getCommunitiesByCounty = (county: string) => {
    return communities.value?.filter(community => 
      community.county.toLowerCase() === county.toLowerCase()
    ) || []
  }

  const searchCommunities = (query: string) => {
    if (!query || !communities.value) return []
    
    const searchTerm = query.toLowerCase()
    return communities.value.filter(community =>
      community.name.toLowerCase().includes(searchTerm) ||
      community.location.toLowerCase().includes(searchTerm) ||
      community.county.toLowerCase().includes(searchTerm) ||
      community.description.toLowerCase().includes(searchTerm)
    )
  }

  const getUniqueCounties = () => {
    if (!communities.value) return []
    const counties = communities.value.map(c => c.county)
    return [...new Set(counties)].sort()
  }

  const getUniqueRegions = () => {
    if (!communities.value) return []
    // Extract regions from community locations if available
    // This is a simplified approach - you might want to have a separate regions collection
    const regions = communities.value.map(c => {
      // Assuming location format includes region info
      const locationParts = c.location.split(',')
      return locationParts[locationParts.length - 1]?.trim()
    }).filter(Boolean)
    return [...new Set(regions)].sort()
  }

  return {
    communities,
    loading,
    error,
    createCommunity,
    updateCommunity,
    deleteCommunity,
    getCommunity,
    getAllCommunities,
    subscribe,
    getCommunitiesByCounty,
    searchCommunities,
    getUniqueCounties,
    getUniqueRegions
  }
}