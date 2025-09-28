import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { userDb } from '@/lib/database'
import { blockchainService } from '@/lib/blockchain'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No authorization token' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user data
    const user = await userDb.findByFirebaseId(decodedToken.uid)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.private_key) {
      return NextResponse.json(
        { success: false, error: 'User wallet not found' },
        { status: 400 }
      )
    }

    // Get wallet balance
    const balance = await blockchainService.getWalletBalanceFromKey(user.private_key)
    
    return NextResponse.json({
      success: true,
      balance: balance.toString(),
      walletAddress: user.wallet_address,
      hasEnoughForGas: parseFloat(balance) > 0.001 // Minimum recommended balance
    })

  } catch (error) {
    console.error('Balance check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check balance' },
      { status: 500 }
    )
  }
}