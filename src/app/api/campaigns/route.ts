import { NextRequest, NextResponse } from 'next/server'
import { blockchainService } from '@/lib/blockchain'
import { campaignDb, sql } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const creator = searchParams.get('creator')

    // Get campaigns from database
    let campaigns
    if (creator) {
      campaigns = await campaignDb.findByCreator(creator)
    } else {
      campaigns = await campaignDb.findAll()
    }

    // Enrich with blockchain data
    const enrichedCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        let blockchainData = null
        let blockchainError = null
        
        try {
          blockchainData = await blockchainService.getCampaignData(campaign.contract_address)
          console.log(`📊 Blockchain data for ${campaign.title}:`, blockchainData)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Failed to fetch blockchain data for ${campaign.contract_address}:`, errorMessage)
          blockchainError = errorMessage
        }
        
        // Get database contribution data as fallback
        const dbContributions = await sql`
          SELECT COUNT(*) as contribution_count, COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_contributed
          FROM contributions 
          WHERE campaign_id = ${campaign.id}
        `
        const dbStats = dbContributions[0] || { contribution_count: 0, total_contributed: 0 }
        
        console.log(`💰 Database contributions for ${campaign.title}:`, {
          count: dbStats.contribution_count,
          total: dbStats.total_contributed.toString()
        })
        
        // Debug auto-withdrawal conditions
        console.log(`🔍 Auto-withdrawal check for ${campaign.title}:`, {
          hasBlockchainData: !!blockchainData,
          isActive: blockchainData?.isActive,
          isSuccessful: blockchainData?.isSuccessful,
          withdrawn: blockchainData?.withdrawn,
          withdrawal_processed: campaign.withdrawal_processed
        })
        
        // Auto-withdraw check: If campaign is expired and successful, trigger withdrawal
        if (blockchainData && !blockchainData.isActive && blockchainData.isSuccessful && !blockchainData.withdrawn && !campaign.withdrawal_processed) {
          console.log(`🎯 Auto-withdrawal triggered for successful campaign: ${campaign.title}`)
          
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
              
              console.log(`💰 Auto-withdrawal successful! TX: ${withdrawalResult.txHash}`)
            } else {
              console.log(`❌ Auto-withdrawal failed: ${withdrawalResult.error}`)
            }
          } catch (autoWithdrawError) {
            console.error(`❌ Error during auto-withdrawal:`, autoWithdrawError)
            // Don't fail the main request if withdrawal fails
          }
        }
        
        // Calculate fallback time remaining from database deadline if blockchain data unavailable
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
        
        console.log(`📈 Progress calculation for ${campaign.title}:`, {
          totalRaised,
          goalAmount, 
          progress: `${progress.toFixed(2)}%`
        })
        
        return {
          ...campaign,
          // Map database fields to match Campaign interface
          address: campaign.contract_address,
          goal: campaign.target?.toString() || '0',
          creator: campaign.creator_id || 'Unknown',
          isActive: campaign.is_active,
          // Blockchain enriched data
          blockchain: blockchainData,
          blockchainError,
          status: blockchainData?.isActive ? 'active' : (timeRemaining > 0 ? 'active' : 'inactive'),
          progress,
          timeRemaining,
          totalRaised,
          goalAmount,
          // Default values for missing fields
          totalContributed: totalRaised,
          withdrawn: false,
          isSuccessful: false,
        }
      })
    )

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns
    })

  } catch (error) {
    console.error('Campaigns fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}