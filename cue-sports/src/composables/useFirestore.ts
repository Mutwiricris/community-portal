import { ref, computed } from 'vue'
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
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
import { getFirebaseDb, checkFirebaseHealth } from '@/firebase/config'
import { handleFirebaseError, logFirebaseError, retryOperation } from '@/firebase/errorHandler'

export interface FirestoreErrorInfo {
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
  retryable: boolean
  details?: any
}

export const useFirestore = <T extends Record<string, any>>(collectionName: string) => {
  const documents = ref<(T & { id: string })[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorDetails = ref<FirestoreErrorInfo | null>(null)
  let unsubscribe: (() => void) | null = null

  // Check Firebase health before operations
  const checkHealth = () => {
    const health = checkFirebaseHealth()
    if (health.error) {
      throw new Error('Firebase is not properly initialized. Please check your configuration.')
    }
  }

  const add = async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      checkHealth()
      loading.value = true
      error.value = null
      errorDetails.value = null
      
      const db = getFirebaseDb()
      
      const docData = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      // Use retry logic for network operations
      const docRef = await retryOperation(
        () => addDoc(collection(db, collectionName), docData),
        3,
        1000
      )
      
      logFirebaseError(null, 'Firestore add success', { 
        collection: collectionName, 
        docId: docRef.id 
      })
      
      return docRef.id
    } catch (err: any) {
      logFirebaseError(err, 'Firestore add', { collection: collectionName })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const update = async (id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>) => {
    try {
      checkHealth()
      loading.value = true
      error.value = null
      errorDetails.value = null
      
      const db = getFirebaseDb()
      
      const updateData = {
        ...data,
        updatedAt: Timestamp.now()
      }
      
      // Use retry logic for network operations
      await retryOperation(
        () => updateDoc(doc(db, collectionName, id), updateData),
        3,
        1000
      )
      
      logFirebaseError(null, 'Firestore update success', { 
        collection: collectionName, 
        docId: id 
      })
    } catch (err: any) {
      logFirebaseError(err, 'Firestore update', { 
        collection: collectionName, 
        docId: id 
      })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const remove = async (id: string) => {
    try {
      checkHealth()
      loading.value = true
      error.value = null
      errorDetails.value = null
      
      const db = getFirebaseDb()
      
      // Use retry logic for network operations
      await retryOperation(
        () => deleteDoc(doc(db, collectionName, id)),
        3,
        1000
      )
      
      logFirebaseError(null, 'Firestore delete success', { 
        collection: collectionName, 
        docId: id 
      })
    } catch (err: any) {
      logFirebaseError(err, 'Firestore delete', { 
        collection: collectionName, 
        docId: id 
      })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const getById = async (id: string) => {
    try {
      checkHealth()
      loading.value = true
      error.value = null
      errorDetails.value = null
      
      const db = getFirebaseDb()
      
      // Use retry logic for network operations
      const docSnap = await retryOperation(
        () => getDoc(doc(db, collectionName, id)),
        3,
        1000
      )
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T & { id: string }
      }
      
      // Document not found
      const notFoundError = new Error(`Document with ID ${id} not found in ${collectionName}`)
      logFirebaseError(notFoundError, 'Firestore getById', { 
        collection: collectionName, 
        docId: id 
      })
      
      return null
    } catch (err: any) {
      logFirebaseError(err, 'Firestore getById', { 
        collection: collectionName, 
        docId: id 
      })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAll = async (constraints: QueryConstraint[] = []) => {
    try {
      checkHealth()
      loading.value = true
      error.value = null
      errorDetails.value = null
      
      const db = getFirebaseDb()
      
      // Use retry logic for network operations
      const q = query(collection(db, collectionName), ...constraints)
      const querySnapshot = await retryOperation(
        () => getDocs(q),
        3,
        1000
      )
      
      documents.value = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (T & { id: string })[]
      
      logFirebaseError(null, 'Firestore getAll success', { 
        collection: collectionName, 
        count: documents.value.length 
      })
      
      return documents.value
    } catch (err: any) {
      logFirebaseError(err, 'Firestore getAll', { collection: collectionName })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    } finally {
      loading.value = false
    }
  }

  const subscribe = (constraints: QueryConstraint[] = []) => {
    try {
      checkHealth()
      
      // Unsubscribe from previous listener if exists
      if (unsubscribe) {
        unsubscribe()
      }
      
      const db = getFirebaseDb()
      const q = query(collection(db, collectionName), ...constraints)
      
      unsubscribe = onSnapshot(
        q, 
        (snapshot) => {
          documents.value = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as (T & { id: string })[]
          
          error.value = null
          errorDetails.value = null
          
          logFirebaseError(null, 'Firestore subscription update', { 
            collection: collectionName, 
            count: documents.value.length 
          })
        }, 
        (err: FirestoreError) => {
          logFirebaseError(err, 'Firestore subscription error', { 
            collection: collectionName 
          })
          const errorInfo = handleFirebaseError(err)
          error.value = errorInfo.userMessage
          errorDetails.value = {
            message: errorInfo.userMessage,
            code: errorInfo.code,
            severity: errorInfo.severity,
            retryable: errorInfo.retryable,
            details: err
          }
          
          // Attempt to resubscribe if error is retryable
          if (errorInfo.retryable) {
            setTimeout(() => {
              console.log('Attempting to resubscribe after error...')
              subscribe(constraints)
            }, 5000)
          }
        }
      )
      
      return unsubscribe
    } catch (err: any) {
      logFirebaseError(err, 'Firestore subscribe setup', { collection: collectionName })
      const errorInfo = handleFirebaseError(err)
      error.value = errorInfo.userMessage
      errorDetails.value = {
        message: errorInfo.userMessage,
        code: errorInfo.code,
        severity: errorInfo.severity,
        retryable: errorInfo.retryable,
        details: err
      }
      throw err
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  return {
    documents: computed(() => documents.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    errorDetails: computed(() => errorDetails.value),
    add,
    update,
    remove,
    getById,
    getAll,
    subscribe,
    cleanup,
    // Alias methods for direct access
    addDoc: add,
    updateDoc: update,
    getDoc: getById,
    subscribeToCollection: subscribe
  }
}