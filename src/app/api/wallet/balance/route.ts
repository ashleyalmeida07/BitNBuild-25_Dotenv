import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { userDb } from '@/lib/database'
import { blockchainService } from '@/lib/blockchain'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization header missing' },
        { status: 401 }
      )
    }

    const idToken = authHeader.substring(7)
    const decodedToken = await verifyIdToken(idToken)
    
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user data - try firebase_id first, then fall back to email
    let user
    try {
      user = await userDb.findByFirebaseId(decodedToken.uid)
    } catch (error) {
      // If firebase_id column doesn't exist, fall back to email lookup
      console.log('Firebase ID lookup failed, using email lookup:', error)
      if (decodedToken.email) {
        user = await userDb.findByEmail(decodedToken.email)
      }
    }
    
    if (!user || !user.wallet_address) {
      return NextResponse.json(
        { success: false, error: 'User wallet not found' },
        { status: 404 }
      )
    }

    // Get balance from blockchain
    const balance = await blockchainService.getWalletBalance(user.wallet_address)

    return NextResponse.json({
      success: true,
      balance,
      walletAddress: user.wallet_address
    })

  } catch (error) {
    console.error('Balance fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}