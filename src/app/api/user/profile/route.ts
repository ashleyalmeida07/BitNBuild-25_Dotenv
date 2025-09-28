import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { userDb } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.replace('Bearer ', '')
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const { email, uid } = decodedToken

    if (!email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Try to find user by firebase_id first, then fall back to email
    let user
    try {
      user = await userDb.findByFirebaseId(uid)
    } catch (error) {
      // If firebase_id column doesn't exist, fall back to email lookup
      console.log('Firebase ID lookup failed, using email lookup:', error)
      user = await userDb.findByEmail(email)
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.wallet_address,
        image: user.image,
        createdAt: user.created_at,
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}