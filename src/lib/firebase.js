import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const env = import.meta.env

export const app = initializeApp({
  apiKey: "AIzaSyByjlzh7U9K7g78b9EaCqaK-wH_FkOd7sg",
  authDomain: "qtrend-warehouse-management.firebaseapp.com",
  projectId: "qtrend-warehouse-management",
  storageBucket: "qtrend-warehouse-management.firebasestorage.app",
  messagingSenderId: "365977944819",
  appId: "1:365977944819:web:ed66b9094882ab2fbeed86",
  measurementId: "G-JR7PV9DGMG"
})

export const auth = getAuth(app)
// Cache in IndexedDB so reloads resume listeners from cache and only pay for changed docs,
// instead of re-reading every product/position/stock doc each time.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})
export const googleProvider = new GoogleAuthProvider()
