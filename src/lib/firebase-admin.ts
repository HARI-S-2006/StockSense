import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'

let adminApp: App
let adminAuth: Auth
let adminDb: Firestore

function initFirebaseAdmin() {
  if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!privateKey) {
      console.warn('Firebase Admin mock initialized because FIREBASE_PRIVATE_KEY is missing.')
      return { app: {} as App, auth: {} as Auth, db: {} as Firestore }
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    })
  } else {
    adminApp = getApp()
  }

  adminAuth = getAuth(adminApp)
  adminDb = getFirestore(adminApp)
  return { app: adminApp, auth: adminAuth, db: adminDb }
}

const { app, auth, db } = initFirebaseAdmin()

export { app as adminApp, auth as adminAuth, db as adminDb }

export async function verifyIdToken(idToken: string) {
  if (!auth.verifyIdToken) return { uid: 'mock-uid', email: 'mock@example.com' }
  return auth.verifyIdToken(idToken)
}

export async function getUserByFirebaseUid(firebaseUid: string) {
  return auth.getUser(firebaseUid)
}

export async function createCustomToken(firebaseUid: string) {
  return auth.createCustomToken(firebaseUid)
}