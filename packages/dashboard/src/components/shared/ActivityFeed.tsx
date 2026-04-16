import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useActivityFeed } from '../../context/NexusContext'
import type { AgentName } from '../../data/MockDataEngine'
import { theme } from '../../styles/theme'

const AGENT_COLORS: Record<AgentName, string> = theme.agent

const AGENT_BG: Record<AgentName, string> = {
  'Market Intel': 'rgba(0,229,255,0.08)',
  'Strategy':     'rgba(168,85,247,0.08)',
  'Execution':    'rgba(245,158,11,0.08)',
  'Risk':         'rgba(255,68,68,0.08)',
  'Portfolio':    'rgba(0,255,136,0.08)',
  'Liquidity':    'rgba(56,189,248,0.08)',
  'Simulation':   'rgba(244,114,182,0.08)',
}

export default function ActivityFeed({ maxHeight = 400 }: { maxHeight?: number }) {
  const feed   = useActivityFeed()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new items arrive
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0
  }, [feed.length])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div className="flex items-center gap-2">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Agent Activity Feed
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {feed.length} events
        </span>
      </div>

      {/* Feed list */}
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight }}>
        {feed.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Awaiting agent signals...
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feed.map((entry, i) => {
              const color = AGENT_COLORS[entry.agent]
              const bg    = AGENT_BG[entry.agent]
              const isFirst = i === 0
              return (
                <motion.div
                  key={entry.id}
                  initial={isFirst ? { opacity: 0, y: -20, scale: 0.97 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 px-5 py-3 transition-colors duration-150"
                  style={{
                    borderBottom: '1px solid var(--border-dim)',
                    opacity: 1 - i * 0.025,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Timestamp */}
                  <span className="text-[9px] flex-shrink-0 mt-0.5 w-14"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {entry.ts}
                  </span>

                  {/* Agent badge */}
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-[0.1em] flex-shrink-0"
                    style={{ background: bg, color, border: `1px solid ${color}30`, fontFamily: 'var(--font-mono)' }}>
                    {entry.agent}
                  </span>

                  {/* Message */}
                  <span className="text-[11px] flex-1 min-w-0"
                    style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {entry.message}
                  </span>

                  {/* Value */}
                  {entry.value && (
                    <span className="text-[11px] font-bold flex-shrink-0"
                      style={{ color, fontFamily: 'var(--font-mono)' }}>
                      {entry.value}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
