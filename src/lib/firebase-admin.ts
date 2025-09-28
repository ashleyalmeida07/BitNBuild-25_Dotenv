import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set')
  }

  try {
    // Decode base64 service account
    const decodedServiceAccount = Buffer.from(serviceAccount, 'base64').toString('utf8')
    const serviceAccountObj = JSON.parse(decodedServiceAccount)

    return initializeApp({
      credential: cert(serviceAccountObj),
      projectId: serviceAccountObj.project_id,
    })
  } catch {
    throw new Error('Invalid Firebase service account key')
  }
}

export const adminAuth = getAuth(getFirebaseAdmin())

// Verify Firebase ID token
export async function verifyIdToken(idToken: string) {
  try {
    return await adminAuth.verifyIdToken(idToken)
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export default getFirebaseAdmin