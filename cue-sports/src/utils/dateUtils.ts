import type { Timestamp } from 'firebase/firestore'

/**
 * Safely converts a Firestore Timestamp or date string to a Date object
 * @param dateValue - Can be a Firestore Timestamp, Date, string, or null/undefined
 * @returns Date object or null if invalid
 */
export function safeToDate(dateValue: any): Date | null {
  if (!dateValue) {
    return null
  }

  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue
  }

  // If it's a Firestore Timestamp
  if (dateValue && typeof dateValue === 'object' && 'toDate' in dateValue) {
    try {
      return dateValue.toDate()
    } catch (error) {
      console.warn('Failed to convert Firestore Timestamp to Date:', error)
      return null
    }
  }

  // If it's a string or number, try to create a Date
  try {
    const date = new Date(dateValue)
    return isNaN(date.getTime()) ? null : date
  } catch (error) {
    console.warn('Failed to convert value to Date:', dateValue, error)
    return null
  }
}

/**
 * Formats a date value safely for display
 * @param dateValue - Any date-like value
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string or fallback text
 */
export function formatDate(dateValue: any, options?: Intl.DateTimeFormatOptions, fallback = 'Unknown'): string {
  const date = safeToDate(dateValue)
  if (!date) {
    return fallback
  }

  try {
    return new Intl.DateTimeFormat('en-US', options).format(date)
  } catch (error) {
    console.warn('Failed to format date:', error)
    return fallback
  }
}

/**
 * Calculates the difference in days between two dates
 * @param dateA - First date
 * @param dateB - Second date
 * @returns Number of days difference, or null if either date is invalid
 */
export function daysDifference(dateA: any, dateB: any): number | null {
  const dateObjA = safeToDate(dateA)
  const dateObjB = safeToDate(dateB)
  
  if (!dateObjA || !dateObjB) {
    return null
  }

  const diffTime = Math.abs(dateObjA.getTime() - dateObjB.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Checks if a date is within the last N days
 * @param dateValue - Date to check
 * @param days - Number of days to check within (default: 30)
 * @returns Boolean indicating if date is within range
 */
export function isWithinDays(dateValue: any, days = 30): boolean {
  const date = safeToDate(dateValue)
  if (!date) {
    return false
  }

  const now = new Date()
  const daysDiff = daysDifference(now, date)
  return daysDiff !== null && daysDiff <= days
}