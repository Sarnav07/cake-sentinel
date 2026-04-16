import React from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useLivePnL, useNexus } from '../../context/NexusContext'
import SkeletonLoader from '../ui/SkeletonLoader'
import MonoValue from '../ui/MonoValue'

const spark = (seed: number, len = 12) =>
  Array.from({ length: len }, (_, i) => ({ v: 50 + Math.sin((i + seed) / 2) * 30 + Math.random() * 10 }))

// Stats built dynamically from live data — see StatsBar component body

export default function StatsBar() {
  const pnl = useLivePnL()
  const { isInitializing } = useNexus()

  if (isInitializing) return <SkeletonLoader type="stat" count={4} />

  const STATS = [
    {
      label: 'Total P&L',
      value: `${pnl.total >= 0 ? '+' : ''}$${pnl.total.toFixed(2)}`,
      color: pnl.total >= 0 ? 'var(--green)' : 'var(--red)',
      stroke: pnl.total >= 0 ? '#00ff88' : '#ff4444',
      data: spark(0),
    },
    {
      label: 'Win Rate',
      value: `${pnl.winRate.toFixed(1)}%`,
      color: 'var(--cyan)', stroke: '#00e5ff', data: spark(2),
    },
    {
      label: 'Active Trades',
      value: String(pnl.activeCount),
      color: 'var(--purple)', stroke: '#a855f7', data: spark(4),
    },
    {
      label: 'Total Trades',
      value: String(pnl.tradeCount),
      color: 'var(--magenta)', stroke: '#ff2d78', data: spark(6),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-xl p-4 transition-all duration-300 group"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)',
          }}
          whileHover={{ borderColor: 'var(--border-accent)', boxShadow: '0 0 20px rgba(0,229,255,0.05)' }}
        >
          {/* Sparkline background */}
          <div className="absolute inset-0 bottom-0 opacity-70 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sg-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.stroke} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={s.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={s.stroke}
                  strokeWidth={1.5}
                  fill={`url(#sg-${i})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Content */}
          <div className="relative z-10">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {s.label}
            </p>
            <MonoValue value={s.value} color={s.color} size="xl" flash={true} className="leading-none" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
