import React from 'react'
import { motion } from 'framer-motion'
import { usePoolData } from '../../context/NexusContext'

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  'BLUE-CHIP': { background: 'rgba(0,229,255,0.10)',  border: '1px solid rgba(0,229,255,0.25)',  color: '#00e5ff' },
  'MID-CAP':   { background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' },
  'DEGEN':     { background: 'rgba(255,68,68,0.10)',  border: '1px solid rgba(255,68,68,0.25)',  color: '#ff4444' },
}

const APR_COLOR = (apr: number) =>
  apr < 20 ? 'var(--green)' : apr < 60 ? 'var(--amber)' : 'var(--red)'

const fmtNum = (n: number) =>
  n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T`
  : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B`
  : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K`
  : `$${n.toFixed(0)}`

export default function PoolIntelligence() {
  const pools = usePoolData().slice(0, 3) // show top 3 on Market tab sidebar

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <span className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Pool Intelligence</span>
      </div>

      {/* Pool cards — live from engine */}
      <div className="p-3 space-y-2">
        {pools.map((pool, i) => (
          <motion.div
            key={pool.name}
            layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="rounded-lg p-4 transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)' }}
            whileHover={{ background: 'rgba(0,229,255,0.02)', borderColor: 'var(--border-accent)' }}
          >
            {/* Top: name + badges */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {pool.name.replace('/', ' / ')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ fontFamily: 'var(--font-mono)', ...BADGE_STYLES[pool.tier] }}>
                  {pool.tier}
                </span>
                {pool.arb && (
                  <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={{ fontFamily: 'var(--font-mono)', background: 'rgba(245,158,11,0.15)',
                      border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}>
                    ⚡ ARB
                  </motion.span>
                )}
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Fee Tier: {pool.fee}
            </p>

            {/* 3-col live metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'TVL',     value: fmtNum(pool.tvl),       color: 'var(--text-primary)'   },
                { label: 'VOL 24H', value: fmtNum(pool.vol24h),    color: 'var(--text-secondary)' },
                { label: 'FEE APR', value: pool.apr,               color: APR_COLOR(pool.aprRaw)  },
              ].map(m => (
                <div key={m.label} className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-[0.15em] mb-1"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</span>
                  <span className="text-[12px] font-bold"
                    style={{ color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
