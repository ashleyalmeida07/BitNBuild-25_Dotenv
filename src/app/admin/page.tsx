'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)

  const processExpiredCampaigns = async () => {
    setProcessing(true)
    setResults(null)

    try {
      const response = await fetch('/api/campaigns/process-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error('Error processing campaigns:', error)
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Campaign Administration</h1>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Manual Campaign Processing</h2>
            <p className="text-gray-300 mb-4">
              The system automatically processes expired campaigns when users interact with them. 
              Use this button to manually check all campaigns right now.
            </p>
            
            <button
              onClick={processExpiredCampaigns}
              disabled={processing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Check & Process Campaigns'}
            </button>
            
            <div className="mt-4 p-4 bg-blue-500/20 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">How It Works</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Automatic withdrawal when users visit expired successful campaigns</li>
                <li>• Auto-processing when users try to contribute to expired campaigns</li>
                <li>• Creator dashboard automatically processes their expired campaigns</li>
                <li>• No cron jobs needed - event-driven processing!</li>
              </ul>
            </div>
          </div>

          {results && (
            <div className="bg-white/20 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Results</h3>
              
              {results.success ? (
                <div>
                  <p className="text-green-300 mb-4">
                    ✅ Processed {results.processed} campaigns
                  </p>
                  
                  {results.results && results.results.length > 0 && (
                    <div className="space-y-3">
                      {results.results.map((result: any, index: number) => (
                        <div key={index} className="bg-white/10 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-white">{result.title}</p>
                              <p className="text-sm text-gray-300">ID: {result.campaignId}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-sm ${
                                result.status === 'withdrawn' ? 'bg-green-500 text-white' :
                                result.status === 'already_withdrawn' ? 'bg-blue-500 text-white' :
                                result.status === 'goal_not_reached' ? 'bg-yellow-500 text-black' :
                                result.status === 'not_expired' ? 'bg-gray-500 text-white' :
                                'bg-red-500 text-white'
                              }`}>
                                {result.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {result.txHash && (
                            <p className="text-xs text-blue-300 mt-2">
                              TX: {result.txHash}
                            </p>
                          )}
                          
                          {result.amount && (
                            <p className="text-xs text-green-300 mt-1">
                              Amount: {result.amount} wei
                            </p>
                          )}
                          
                          {result.error && (
                            <p className="text-xs text-red-300 mt-1">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-300">
                  ❌ Error: {results.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}