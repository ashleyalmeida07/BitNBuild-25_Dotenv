import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { userDb, campaignDb, sql } from '@/lib/database'
import { blockchainService } from '@/lib/blockchain'
import { ethers } from 'ethers'
import { encryptData } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Campaign Creation API Called ===')
    
    // Check environment variables
    console.log('Environment check:')
    console.log('- ENCRYPTION_KEY exists:', !!process.env.ENCRYPTION_KEY)
    console.log('- NEXT_PUBLIC_ALCHEMY_API_KEY exists:', !!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY)
    console.log('- NODE_ENV:', process.env.NODE_ENV)
    
    // Test blockchain service availability
    try {
      if (!blockchainService) {
        throw new Error('Blockchain service not initialized')
      }
    } catch (serviceError) {
      console.error('Blockchain service error:', serviceError)
      return NextResponse.json(
        { success: false, error: 'Blockchain service unavailable: ' + (serviceError instanceof Error ? serviceError.message : 'Unknown error') },
        { status: 503 }
      )
    }
    
    const body = await request.json()
    console.log('Request body:', body)
    
    const { 
      idToken, 
      title, 
      description, 
      goalInEth, 
      durationInDays
    } = body

    console.log('Parsed fields:', { title, description, goalInEth, durationInDays })

    // Verify Firebase ID token
    console.log('Verifying ID token...')
    const decodedToken = await verifyIdToken(idToken)
    if (!decodedToken) {
      console.log('Token verification failed')
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    console.log('Token verified for user:', decodedToken.uid)

    // Get user data including encrypted private key
    console.log('Looking up user...')
    const user = await userDb.findByFirebaseId(decodedToken.uid)
    if (!user) {
      console.log('User not found for firebase_id:', decodedToken.uid)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    console.log('User found:', { id: user.id, role: user.role, hasPrivateKey: !!user.private_key })

    // Check if user has creator role
    if (user.role !== 'creator') {
      console.log('User role check failed. Role:', user.role)
      return NextResponse.json(
        { success: false, error: 'Only creators can create campaigns' },
        { status: 403 }
      )
    }

    if (!user.private_key) {
      console.log('User missing encrypted private key - creating wallet...')
      
      // Auto-create wallet for user
      const wallet = ethers.Wallet.createRandom()
      const walletAddress = wallet.address
      const encryptionKey = process.env.ENCRYPTION_KEY!
      const encryptedPrivateKey = encryptData(wallet.privateKey, encryptionKey)
      
      // Update user with new wallet using SQL directly
      await sql`
        UPDATE users 
        SET wallet_address = ${walletAddress}, private_key = ${encryptedPrivateKey}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
      `
      
      // Update user object for continued processing
      user.wallet_address = walletAddress
      user.private_key = encryptedPrivateKey
      
      console.log('Wallet created for user:', { walletAddress })
    }

    // Validate input
    const goalNum = parseFloat(goalInEth)
    const durationNum = parseFloat(durationInDays) // Allow decimal days for testing
    
    console.log('Validation:', { goalNum, durationNum, goalValid: !isNaN(goalNum) && goalNum > 0, durationValid: !isNaN(durationNum) && durationNum > 0 && durationNum <= 365 })

    if (isNaN(goalNum) || goalNum <= 0) {
      console.log('Invalid goal amount:', goalInEth)
      return NextResponse.json(
        { success: false, error: 'Invalid goal amount' },
        { status: 400 }
      )
    }

    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 365) {
      console.log('Invalid duration:', durationInDays)
      return NextResponse.json(
        { success: false, error: 'Duration must be between 0.001-365 days (decimals allowed for testing)' },
        { status: 400 }
      )
    }

    // Create campaign on blockchain
    console.log('Creating campaign on blockchain...')
    const blockchainResult = await blockchainService.createCampaign(
      user.private_key,
      goalInEth,
      durationNum
    )
    console.log('Blockchain result:', blockchainResult)

    if (!blockchainResult.success) {
      console.log('Blockchain creation failed:', blockchainResult.error)
      
      // Check for specific error types and provide helpful messages
      let statusCode = 500
      let errorMessage = blockchainResult.error || 'Unknown blockchain error'
      
      if (errorMessage.includes('Insufficient funds')) {
        statusCode = 400
        errorMessage = 'Insufficient funds: Your wallet needs test ETH to pay for gas fees. Please get test ETH from a Sepolia faucet.'
      } else if (errorMessage.includes('Transaction would fail')) {
        statusCode = 400
        errorMessage = 'Transaction validation failed: ' + errorMessage
      } else if (errorMessage.includes('network')) {
        statusCode = 503
        errorMessage = 'Network error: Unable to connect to Sepolia network'
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: statusCode }
      )
    }

    // Save campaign to database
    console.log('Saving campaign to database...')
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + durationNum)
    
    const campaignData = await campaignDb.create({
      title,
      description,
      target: goalInEth,
      deadline,
      contractAddress: blockchainResult.campaignAddress || '',
      creatorId: user.firebase_id
    })
    console.log('Campaign saved to database:', campaignData.id)

    return NextResponse.json({
      success: true,
      campaign: campaignData,
      transactionHash: blockchainResult.transactionHash,
      campaignAddress: blockchainResult.campaignAddress,
      gasUsed: blockchainResult.gasUsed,
      message: 'Campaign created successfully!'
    })

  } catch (error) {
    console.error('Campaign creation error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}