import { 
  collection, 
  doc, 
  addDoc as fbAddDoc, 
  updateDoc as fbUpdateDoc, 
  deleteDoc, 
  getDoc as fbGetDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint,
  FirestoreError
} from 'firebase/firestore'
import { getFirebaseDb } from '@/firebase/config'

// Simple utility functions for direct Firestore operations
export const getDoc = async (collectionName: string, docId: string): Promise<any> => {
  const db = getFirebaseDb()
  const docRef = doc(db, collectionName, docId)
  const docSnap = await fbGetDoc(docRef)
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
}

export const updateDoc = async (collectionName: string, docId: string, data: any) => {
  const db = getFirebaseDb()
  const docRef = doc(db, collectionName, docId)
  await fbUpdateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
  })
}

export const addDoc = async (collectionName: string, data: any) => {
  const db = getFirebaseDb()
  const collRef = collection(db, collectionName)
  const docRef = await fbAddDoc(collRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export const subscribeToCollection = (
  collectionName: string,
  onData: (data: any[]) => void,
  onError?: (error: FirestoreError) => void,
  constraints: QueryConstraint[] = []
) => {
  const db = getFirebaseDb()
  
  // If no constraints, just use the collection directly
  const q = constraints.length > 0 
    ? query(collection(db, collectionName), ...constraints)
    : collection(db, collectionName)
  
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      onData(data)
    },
    onError
  )
}

// Utility to handle Firebase Timestamp conversion
export const formatTimestamp = (timestamp: any): Date => {
  if (!timestamp) return new Date()
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? new Date() : timestamp
  }
  
  // If it's a Firestore Timestamp
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    try {
      return timestamp.toDate()
    } catch (error) {
      console.warn('Failed to convert Firestore Timestamp to Date:', error)
      return new Date()
    }
  }
  
  // Try to create a Date from string/number
  try {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? new Date() : date
  } catch (error) {
    console.warn('Failed to convert value to Date:', timestamp, error)
    return new Date()
  }
}