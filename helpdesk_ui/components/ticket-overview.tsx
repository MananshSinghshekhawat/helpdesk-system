'use client'

import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { type TicketSummary } from '@/lib/api'

type TicketOverviewProps = {
  tickets: TicketSummary[]
}

function normalizeStatus(status: string) {
  const value = status.toLowerCase().replace(/_/g, '-')
  if (value === 'new' || value === 'open' || value === 'assigned') return 'open'
  if (value === 'in-progress' || value === 'in_progress' || value === 'waiting') return 'in-progress'
  if (value === 'resolved' || value === 'closed') return 'closed'
  return 'other'
}

export function TicketOverview({ tickets }: TicketOverviewProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const stats = useMemo(() => {
    const openTickets = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'open').length
    const inProgressTickets = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'in-progress').length
    const closedTickets = tickets.filter((ticket) => normalizeStatus(ticket.status) === 'closed').length

    return {
      open: openTickets,
      inProgress: inProgressTickets,
      closed: closedTickets,
      total: openTickets + inProgressTickets + closedTickets,
    }
  }, [tickets])

  const { trend, barData } = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(todayStart)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let todayCount = 0
    let last7DaysCount = 0

    // Prepare bar chart data for the last 7 days
    const daysData: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart)
      d.setDate(d.getDate() - i)
      const dayName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      daysData[dayName] = 0
    }

    tickets.forEach(ticket => {
      const date = new Date(ticket.created_at)
      if (date >= todayStart) {
        todayCount++
        const dayName = todayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (daysData[dayName] !== undefined) daysData[dayName]++
      }
      if (date >= sevenDaysAgo && date < todayStart) {
        last7DaysCount++
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const dayName = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (daysData[dayName] !== undefined) daysData[dayName]++
      }
    })

    const avgLast7Days = last7DaysCount / 7
    
    let percentage = 0
    if (avgLast7Days === 0) {
      percentage = todayCount > 0 ? 100 : 0
    } else {
      percentage = ((todayCount - avgLast7Days) / avgLast7Days) * 100
    }

    const formattedBarData = Object.keys(daysData).map(key => ({
      name: key,
      tickets: daysData[key]
    }))

    return {
      trend: {
        today: todayCount,
        percentage: percentage,
        isPositive: percentage >= 0,
        isZero: percentage === 0
      },
      barData: formattedBarData
    }
  }, [tickets])

  const data = [
    { name: 'Open Tickets', value: stats.open, color: '#22c55e' }, // green-500
    { name: 'In Progress', value: stats.inProgress, color: '#3b82f6' }, // blue-500
    { name: 'Closed', value: stats.closed, color: '#a855f7' }, // purple-500
  ]

  const chartData = stats.total === 0 ? [{ name: 'No Data', value: 1, color: 'currentColor' }] : data

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left Section: Donut Chart & Legend */}
        <div className="flex flex-col">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Ticket Overview</h2>
            <p className="text-sm text-muted-foreground">Real-time status of tickets</p>
          </div>
          <div className="flex flex-col items-center justify-start gap-8 md:flex-row py-4">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    className={stats.total === 0 ? "opacity-20" : ""}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                        style={{ transition: 'opacity 0.3s ease' }}
                      />
                    ))}
                  </Pie>
                  {stats.total > 0 && (
                    <PieTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="relative flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: data.color }} />
                              <span className="text-sm font-medium text-foreground">{data.name}:</span>
                              <span className="text-sm font-bold text-foreground">{data.value}</span>
                              <div className="absolute -left-1.5 top-1/2 -mt-1.5 h-3 w-3 rotate-45 border-b border-l border-border bg-card/95"></div>
                            </div>
                          )
                        }
                        return null
                      }}
                      cursor={false}
                      offset={24}
                      wrapperStyle={{ zIndex: 100 }}
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${activeIndex !== null ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-3xl font-bold text-foreground">{stats.total}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-5">
              {data.map((item) => {
                const percentage = stats.total > 0 ? ((item.value / stats.total) * 100).toFixed(1) : '0.0'
                return (
                  <div key={item.name} className="flex items-center gap-6">
                    <div className="flex items-center gap-3 w-32">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="text-base font-semibold text-foreground w-8 text-right">{item.value}</div>
                    <div className="w-14 text-right text-sm text-muted-foreground">{percentage}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Section: Bar Chart */}
        <div className="flex flex-col border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <div className="mb-6 flex items-start justify-between">
            <h2 className="text-lg font-semibold text-foreground">Ticket Volume</h2>
            
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className={`h-4 w-4 ${trend.isPositive && !trend.isZero ? 'text-green-500' : trend.isZero ? 'text-slate-500' : 'text-red-500'}`} />
              <div className="group relative flex cursor-default items-center">
                <span className={`font-medium ${trend.isPositive && !trend.isZero ? 'text-green-500' : trend.isZero ? 'text-slate-500' : 'text-red-500'}`}>
                  {trend.isPositive && !trend.isZero ? '+' : ''}{trend.percentage.toFixed(1)}%
                </span>
                <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-64 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-normal leading-relaxed text-slate-200 shadow-xl">
                    The percentage change in new tickets compared to the average of the previous 7 days.
                  </div>
                  <div className="absolute -top-1 right-6 h-2 w-2 rotate-45 border-l border-t border-slate-700 bg-slate-800"></div>
                </div>
              </div>
              <span className="text-muted-foreground">vs last 7 days</span>
              <div className="group relative ml-2 flex cursor-default items-center">
                <span className="block rounded-full bg-[#1e293b] px-3 py-1 text-xs font-bold text-white shadow-sm ring-1 ring-inset ring-white/10">
                  {trend.today} today
                </span>
                <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-48 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-xs font-normal leading-relaxed text-slate-200 shadow-xl">
                    The total number of new tickets received today.
                  </div>
                  <div className="absolute -top-1 right-6 h-2 w-2 rotate-45 border-l border-t border-slate-700 bg-slate-800"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  allowDecimals={false}
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} 
                />
                <BarTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                          <span className="text-sm font-medium text-foreground">{payload[0].payload.name}: </span>
                          <span className="text-sm font-bold text-foreground">{payload[0].value} tickets</span>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="tickets" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
