import { NextRequest, NextResponse } from 'next/server'
import { blockchainService } from '@/lib/blockchain'
import { sql } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check for cron jobs
    const authHeader = request.headers.get('Authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`
    
    if (authHeader !== expectedAuth) {
      console.warn('❌ Unauthorized access to process-expired endpoint')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }
    
    console.log('🔄 Processing expired campaigns...')
    
    // Get all campaigns that might be expired but not yet processed
    const campaigns = await sql`
      SELECT * FROM campaigns 
      WHERE deadline < NOW() 
      AND (withdrawal_processed IS NULL OR withdrawal_processed = false)
      ORDER BY deadline ASC
    `

    console.log(`Found ${campaigns.length} potentially expired campaigns to process`)

    const results = []

    for (const campaign of campaigns) {
      try {
        console.log(`\n📊 Processing campaign: ${campaign.title} (${campaign.contract_address})`)
        
        // Get current blockchain data
        const blockchainData = await blockchainService.getCampaignData(campaign.contract_address)
        
        if (!blockchainData) {
          console.log(`❌ Could not fetch blockchain data for ${campaign.contract_address}`)
          continue
        }

        const isExpired = blockchainData.timeRemaining <= 0
        const goalReached = parseFloat(blockchainData.totalContributed) >= parseFloat(blockchainData.goal)
        const alreadyWithdrawn = blockchainData.withdrawn

        console.log(`Campaign status:`, {
          isExpired,
          goalReached,
          alreadyWithdrawn,
          totalContributed: blockchainData.totalContributed,
          goal: blockchainData.goal
        })

        if (isExpired) {
          if (goalReached && !alreadyWithdrawn) {
            // Goal was reached and funds not withdrawn - execute withdrawal
            console.log(`✅ Campaign successful! Executing withdrawal for creator...`)
            
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
                      updated_at = NOW()
                  WHERE id = ${campaign.id}
                `
                
                console.log(`💰 Withdrawal successful! TX: ${withdrawalResult.txHash}`)
                results.push({
                  campaignId: campaign.id,
                  title: campaign.title,
                  status: 'withdrawn',
                  txHash: withdrawalResult.txHash,
                  amount: blockchainData.totalContributed
                })
              } else {
                console.log(`❌ Withdrawal failed: ${withdrawalResult.error}`)
                results.push({
                  campaignId: campaign.id,
                  title: campaign.title,
                  status: 'withdrawal_failed',
                  error: withdrawalResult.error
                })
              }
            } catch (error) {
              console.error(`❌ Error during withdrawal:`, error)
              results.push({
                campaignId: campaign.id,
                title: campaign.title,
                status: 'withdrawal_error',
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          } else if (goalReached && alreadyWithdrawn) {
            // Already withdrawn - just update database
            await sql`
              UPDATE campaigns 
              SET withdrawal_processed = true,
                  updated_at = NOW()
              WHERE id = ${campaign.id}
            `
            
            console.log(`✅ Campaign already withdrawn, marked as processed`)
            results.push({
              campaignId: campaign.id,
              title: campaign.title,
              status: 'already_withdrawn'
            })
          } else {
            // Goal not reached - mark as processed but unsuccessful
            await sql`
              UPDATE campaigns 
              SET withdrawal_processed = true,
                  updated_at = NOW()
              WHERE id = ${campaign.id}
            `
            
            console.log(`❌ Campaign unsuccessful - goal not reached`)
            results.push({
              campaignId: campaign.id,
              title: campaign.title,
              status: 'goal_not_reached',
              totalRaised: blockchainData.totalContributed,
              goal: blockchainData.goal
            })
          }
        } else {
          console.log(`⏰ Campaign not yet expired, skipping`)
          results.push({
            campaignId: campaign.id,
            title: campaign.title,
            status: 'not_expired',
            timeRemaining: blockchainData.timeRemaining
          })
        }
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign.id}:`, error)
        results.push({
          campaignId: campaign.id,
          title: campaign.title,
          status: 'processing_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('\n🎯 Processing complete!')
    console.log('Results summary:', results.map(r => `${r.title}: ${r.status}`).join(', '))

    return NextResponse.json({
      success: true,
      processed: campaigns.length,
      results
    })
  } catch (error) {
    console.error('❌ Error processing expired campaigns:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}