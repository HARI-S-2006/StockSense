import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth, onAuthStateChanged, User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

let app: FirebaseApp
let auth: Auth

export function getFirebaseClient(): { app: FirebaseApp; auth: Auth } {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client can only be used in browser environment')
  }
  
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig)
  } else {
    app = getApp()
  }
  
  auth = getAuth(app)
  return { app, auth }
}

export function getAuthInstance(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Auth instance can only be used in browser environment')
  }
  
  const { auth } = getFirebaseClient()
  return auth
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const auth = getAuthInstance()
  return onAuthStateChanged(auth, callback)
}

export { getApps, getApp } from 'firebase/app'
export { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth'