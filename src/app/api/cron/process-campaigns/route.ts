import { NextResponse } from 'next/server'

// Simple cron endpoint that calls the process-expired endpoint
export async function GET() {
  try {
    console.log('🕐 Cron job triggered - processing expired campaigns')
    
    // Make internal request to the process-expired endpoint
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/campaigns/process-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add a simple auth header to prevent abuse
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'default-cron-secret'}`
      }
    })

    const result = await response.json()
    
    console.log('✅ Cron job completed:', result)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })
  } catch (error) {
    console.error('❌ Cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for external cron services
export async function POST() {
  return GET()
}