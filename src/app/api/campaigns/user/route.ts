import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { userDb, campaignDb, sql } from '@/lib/database'
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

    // Get user data
    let user
    try {
      user = await userDb.findByFirebaseId(decodedToken.uid)
    } catch (error) {
      // If firebase_id column doesn't exist, fall back to email lookup
      console.log('Firebase ID lookup failed, using email lookup:', error)
      user = await userDb.findByEmail(decodedToken.email!)
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's campaigns
    const campaignsFromDb = await campaignDb.findByCreator(user.id)
    
    // Enrich campaigns with blockchain data and database contribution stats
    const enrichedCampaigns = await Promise.all(
      campaignsFromDb.map(async (campaign) => {
        let blockchainData = null
        let blockchainError = null
        
        try {
          blockchainData = await blockchainService.getCampaignData(campaign.contract_address)
          console.log(`📊 [Creator Dashboard] Blockchain data for ${campaign.title}:`, blockchainData)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`[Creator Dashboard] Failed to fetch blockchain data for ${campaign.contract_address}:`, errorMessage)
          blockchainError = errorMessage
        }
        
        // Get database contribution data as fallback
        const dbContributions = await sql`
          SELECT COUNT(*) as contribution_count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_contributed
          FROM contributions 
          WHERE campaign_id = ${campaign.id}
        `
        const dbStats = dbContributions[0] || { contribution_count: 0, total_contributed: 0 }
        
        console.log(`💰 [Creator Dashboard] Database contributions for ${campaign.title}:`, {
          count: dbStats.contribution_count,
          total: dbStats.total_contributed.toString()
        })
        
        // Auto-withdraw check: If campaign is expired and successful, trigger withdrawal
        if (blockchainData && !blockchainData.isActive && blockchainData.isSuccessful && !blockchainData.withdrawn && !campaign.withdrawal_processed) {
          console.log(`[Creator Dashboard] 🎯 Auto-withdrawal triggered for successful campaign: ${campaign.title}`)
          
          try {
            const withdrawalResult = await blockchainService.withdrawCampaignFunds(
              campaign.contract_address,
              campaign.creator_id
            )
            
            if (withdrawalResult.success) {
              // Update database to mark as withdrawn
              await sql`
                UPDATE campaigns 
                SET withdrawal_processed = true, 
                    withdrawal_tx_hash = ${withdrawalResult.txHash},
                    withdrawal_processed_at = NOW()
                WHERE id = ${campaign.id}
              `
              
              console.log(`[Creator Dashboard] 💰 Auto-withdrawal successful! TX: ${withdrawalResult.txHash}`)
            } else {
              console.log(`[Creator Dashboard] ❌ Auto-withdrawal failed: ${withdrawalResult.error}`)
            }
          } catch (autoWithdrawError) {
            console.error(`[Creator Dashboard] ❌ Error during auto-withdrawal:`, autoWithdrawError)
            // Don't fail the main request if withdrawal fails
          }
        }
        
        // Calculate time remaining
        let timeRemaining = 0
        if (blockchainData?.timeRemaining) {
          timeRemaining = blockchainData.timeRemaining
        } else if (campaign.deadline) {
          const deadlineTime = new Date(campaign.deadline).getTime() / 1000
          const currentTime = Math.floor(Date.now() / 1000)
          timeRemaining = Math.max(0, deadlineTime - currentTime)
        }
        
        // Use blockchain data first, then fall back to database data
        const totalRaised = blockchainData?.totalContributed || dbStats.total_contributed.toString()
        const goalAmount = blockchainData?.goal || campaign.target
        const progress = goalAmount ? (parseFloat(totalRaised) / parseFloat(goalAmount)) * 100 : 0
        
        console.log(`📈 [Creator Dashboard] Progress calculation for ${campaign.title}:`, {
          totalRaised,
          goalAmount, 
          progress: `${progress.toFixed(2)}%`
        })
        
        return {
          ...campaign,
          // Map database fields to match Campaign interface
          address: campaign.contract_address,
          goal: campaign.target?.toString() || '0',
          creator: campaign.creator_id || user.wallet_address || 'Unknown',
          isActive: campaign.is_active,
          // Enhanced calculated values
          blockchain: blockchainData,
          blockchainError,
          status: blockchainData?.isActive ? 'active' : (timeRemaining > 0 ? 'active' : 'inactive'),
          progress,
          timeRemaining,
          totalRaised,
          goalAmount,
          totalContributed: totalRaised,
          withdrawn: blockchainData?.withdrawn || false,
          isSuccessful: blockchainData?.isSuccessful || false,
        }
      })
    )

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns
    })

  } catch (error) {
    console.error('Error fetching user campaigns:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}