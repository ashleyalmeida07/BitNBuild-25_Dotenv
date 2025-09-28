import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { userDb } from '@/lib/database'
import { encryptData } from '@/lib/crypto-utils'
import { ethers } from 'ethers'

export async function POST(request: NextRequest) {
  try {
    const { idToken, role } = await request.json()

    if (!idToken || !role || !['user', 'creator'].includes(role)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const { uid, email, name, picture } = decodedToken

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    let user = await userDb.findByEmail(email)

    let walletAddress = user?.wallet_address
    let encryptedPrivateKey = user?.private_key

    // Generate wallet if user doesn't have one
    if (!walletAddress) {
      const wallet = ethers.Wallet.createRandom()
      walletAddress = wallet.address

      // Encrypt private key
      const encryptionKey = process.env.ENCRYPTION_KEY!
      encryptedPrivateKey = encryptData(wallet.privateKey, encryptionKey)
    }

    // Create or update user
    user = await userDb.upsert({
      id: uid,
      email,
      name: name || user?.name || '',
      image: picture || user?.image || '',
      role,
      walletAddress,
      privateKey: encryptedPrivateKey!,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
        walletAddress: user.wallet_address,
      }
    })

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}