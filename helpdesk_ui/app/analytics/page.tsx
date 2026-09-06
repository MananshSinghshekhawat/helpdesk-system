'use client'

import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { getAiAnalytics, type AIAnalyticsResponse } from '@/lib/api'
import styles from './analytics.module.css'

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function getBarWidthClass(value: number) {
  const rounded = Math.round(clampPercent(value))
  return styles[`barWidth${rounded}`]
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AIAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      try {
        setLoading(true)
        setError(null)
        const data = await getAiAnalytics()
        if (isMounted) {
          setAnalytics(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [])

  const metrics = [
    {
      title: 'AI Resolution Rate',
      description: 'Percentage of tickets resolved by AI',
      value: analytics?.ai_resolution_rate ?? 0,
      color: 'bg-emerald-500',
      track: 'bg-emerald-500/15',
    },
    {
      title: 'Average Confidence',
      description: 'Average confidence score of AI drafts',
      value: analytics?.avg_confidence ?? 0,
      color: 'bg-sky-500',
      track: 'bg-sky-500/15',
    },
    {
      title: 'Human Override Rate',
      description: 'Percentage of AI replies changed by humans',
      value: analytics?.human_override_rate ?? 0,
      color: 'bg-amber-500',
      track: 'bg-amber-500/15',
    },
  ]

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">View helpdesk performance metrics and insights</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric) => (
              <div key={metric.title} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-foreground">{metric.title}</h2>
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                </div>
                <div className="px-6 py-8 space-y-4">
                  <div className="h-10 rounded-md bg-muted animate-pulse" />
                  <div className="h-2 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metrics.map((metric) => (
              <div key={metric.title} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                  <h2 className="text-lg font-semibold text-foreground">{metric.title}</h2>
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                </div>
                <div className="px-6 py-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-bold text-foreground">{formatPercent(metric.value)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Live data from the analytics API</p>
                    </div>
                    <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {metric.value > 0 ? 'Active' : 'No activity'}
                    </div>
                  </div>

                  <div className={`mt-6 h-2 w-full overflow-hidden rounded-full ${metric.track}`}>
                    <div
                      className={`h-full rounded-full ${metric.color} ${getBarWidthClass(metric.value)}`}
                    />
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {metric.title === 'AI Resolution Rate' &&
                      'Higher values indicate the AI is resolving more tickets without manual intervention.'}
                    {metric.title === 'Average Confidence' &&
                      'This reflects how confident the AI was when drafting responses.'}
                    {metric.title === 'Human Override Rate' &&
                      'Lower values indicate humans are less frequently changing AI-generated replies.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}