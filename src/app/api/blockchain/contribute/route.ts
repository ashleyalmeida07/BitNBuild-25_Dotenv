import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { userDb, sql } from '@/lib/database'
import { blockchainService } from '@/lib/blockchain'
import { ethers } from 'ethers'
import { encryptData } from '@/lib/crypto-utils'

export async function POST(request: NextRequest) {
  try {
    const { idToken, campaignAddress, amount } = await request.json()

    // Validate input parameters
    if (!idToken || !campaignAddress || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: idToken, campaignAddress, amount' },
        { status: 400 }
      )
    }

    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid contribution amount' },
        { status: 400 }
      )
    }

    // Validate campaign address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(campaignAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid campaign address format' },
        { status: 400 }
      )
    }

    // Verify Firebase ID token
    const decodedToken = await verifyIdToken(idToken)
    if (!decodedToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user data including encrypted private key
    const user = await userDb.findByFirebaseId(decodedToken.uid)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
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

    // Check if user has sufficient balance (optional - blockchain will handle this)
    const balance = await blockchainService.getWalletBalance(user.wallet_address)
    const balanceNum = parseFloat(balance)

    if (balanceNum < amountNum) {
      return NextResponse.json(
        { success: false, error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Validate campaign exists and is accessible (optional check - don't block contribution)
    let campaignData = null
    try {
      campaignData = await blockchainService.getCampaignData(campaignAddress)
      if (!campaignData) {
        console.warn('Campaign blockchain data not available for:', campaignAddress)
      } else {
        // Auto-withdrawal check: If campaign is expired and successful, trigger withdrawal
        if (!campaignData.isActive && campaignData.isSuccessful && !campaignData.withdrawn) {
          console.log('🎯 Auto-withdrawal triggered during contribution attempt for successful campaign:', campaignAddress)
          
          // Get campaign from database to check withdrawal status and get creator
          const campaignResult = await sql`
            SELECT * FROM campaigns WHERE contract_address = ${campaignAddress}
          `
          
          if (campaignResult.length > 0) {
            const campaign = campaignResult[0]
            if (!campaign.withdrawal_processed) {
              try {
                const withdrawalResult = await blockchainService.withdrawCampaignFunds(
                  campaignAddress,
                  campaign.creator_id
                )
                
                if (withdrawalResult.success) {
                  // Update database to mark as withdrawn
                  await sql`
                    UPDATE campaigns 
                    SET withdrawal_processed = true, 
                        withdrawal_tx_hash = ${withdrawalResult.txHash},
                        withdrawal_processed_at = NOW()
                    WHERE contract_address = ${campaignAddress}
                  `
                  
                  console.log('💰 Auto-withdrawal successful during contribution! TX:', withdrawalResult.txHash)
                }
              } catch (autoWithdrawError) {
                console.error('❌ Auto-withdrawal error:', autoWithdrawError)
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Campaign validation failed but allowing contribution:', campaignAddress, error)
    }

    // Make contribution using blockchain service
    const result = await blockchainService.contribute(
      campaignAddress,
      user.private_key,
      amount
    )

    if (result.success) {
      // Record contribution in database
      try {
        // First, find the campaign by contract address
        const campaign = await sql`
          SELECT id FROM campaigns WHERE contract_address = ${campaignAddress}
        `
        
        if (campaign.length > 0) {
          const campaignId = campaign[0].id
          
          // Record the contribution
          await sql`
            INSERT INTO contributions (amount, campaign_id, user_id, tx_hash, created_at)
            VALUES (${amount}, ${campaignId}, ${user.id}, ${result.transactionHash}, CURRENT_TIMESTAMP)
          `
          
          console.log('✅ Contribution recorded in database:', {
            campaignId,
            userId: user.id,
            amount,
            transactionHash: result.transactionHash
          })
        } else {
          console.warn('⚠️ Campaign not found in database for address:', campaignAddress)
        }
      } catch (dbError) {
        console.error('❌ Failed to record contribution in database:', dbError)
        // Don't fail the whole request - blockchain transaction already succeeded
      }
      
      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        gasUsed: result.gasUsed,
        message: 'Contribution successful!'
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Contribution error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}