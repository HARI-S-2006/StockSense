import { getFirestore, Firestore, CollectionReference, DocumentReference, QueryDocumentSnapshot, DocumentData, WriteBatch, Transaction } from 'firebase-admin/firestore'
import { adminApp } from '@/lib/firebase-admin'

export const db: Firestore = getFirestore(adminApp)

export const collections = {
  users: 'users',
  products: 'products',
  categories: 'categories',
  warehouses: 'warehouses',
  locations: 'locations',
  suppliers: 'suppliers',
  receipts: 'receipts',
  deliveries: 'deliveries',
  transfers: 'transfers',
  adjustments: 'adjustments',
  stockBalances: 'stockBalances',
  stockLedgerEntries: 'stockLedgerEntries',
  auditLogs: 'auditLogs',
} as const

export type CollectionName = keyof typeof collections

export function col<T extends DocumentData = DocumentData>(name: CollectionName): CollectionReference<T> {
  return db.collection(collections[name]) as CollectionReference<T>
}

export function doc<T extends DocumentData = DocumentData>(name: CollectionName, id: string): DocumentReference<T> {
  return col<T>(name).doc(id)
}

export async function getDoc<T extends DocumentData = DocumentData>(name: CollectionName, id: string): Promise<T | null> {
  const snapshot = await doc<T>(name, id).get()
  if (!snapshot.exists) return null
  return { id: snapshot.id, ...snapshot.data() } as T
}

export async function setDoc<T extends DocumentData>(name: CollectionName, id: string, data: T): Promise<void> {
  await doc<T>(name, id).set(data)
}

export async function addDoc<T extends DocumentData>(name: CollectionName, data: T): Promise<string> {
  const ref = await col<T>(name).add(data)
  return ref.id
}

export async function updateDoc<T extends DocumentData>(name: CollectionName, id: string, data: Partial<T>): Promise<void> {
  await doc<T>(name, id).update(data)
}

export async function deleteDoc(name: CollectionName, id: string): Promise<void> {
  await doc(name, id).delete()
}

export async function queryDocs<T extends DocumentData = DocumentData>(
  name: CollectionName,
  constraints: Array<{ field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown }>,
  orderBy?: { field: string; direction: 'asc' | 'desc' },
  limit?: number
): Promise<T[]> {
  let query: FirebaseFirestore.Query<T> = col<T>(name)
  
  for (const c of constraints) {
    query = query.where(c.field, c.operator, c.value)
  }
  
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction)
  }
  
  if (limit) {
    query = query.limit(limit)
  }
  
  const snapshot = await query.get()
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T))
}

export async function runTransaction<T>(callback: (transaction: Transaction) => Promise<T>): Promise<T> {
  return await db.runTransaction(callback)
}

export function batch(): WriteBatch {
  return db.batch()
}

export function generateId(): string {
  return db.collection('_').doc().id
}

export function serverTimestamp(): FirebaseFirestore.FieldValue {
  return FirebaseFirestore.FieldValue.serverTimestamp()
}

export function increment(value: number): FirebaseFirestore.FieldValue {
  return FirebaseFirestore.FieldValue.increment(value)
}

export function arrayUnion(...elements: unknown[]): FirebaseFirestore.FieldValue {
  return FirebaseFirestore.FieldValue.arrayUnion(...elements)
}

export function arrayRemove(...elements: unknown[]): FirebaseFirestore.FieldValue {
  return FirebaseFirestore.FieldValue.arrayRemove(...elements)
}