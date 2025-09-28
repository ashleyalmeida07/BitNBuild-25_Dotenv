import { NextRequest, NextResponse } from 'next/server'
import { setupDatabase } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development or if specific header is provided
    const authHeader = request.headers.get('x-init-database')
    
    if (process.env.NODE_ENV === 'production' && authHeader !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await setupDatabase()

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    })

  } catch (error) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { error: 'Database initialization failed', details: error },
      { status: 500 }
    )
  }
}