import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import GlowCard from '../components/ui/GlowCard'
import SectionTitle from '../components/ui/SectionTitle'
import StatBadge from '../components/ui/StatBadge'
import MonoValue from '../components/ui/MonoValue'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import { usePoolData, useLivePrice, useNexus } from '../context/NexusContext'
import { engine } from '../data/MockDataEngine'
import type { Pool } from '../data/MockDataEngine'

// ── Style helpers ─────────────────────────────────────────────────────────────
const TIER_STYLE: Record<string, { color: string; badge: 'cyan' | 'amber' | 'red' }> = {
  'BLUE-CHIP': { color: 'var(--cyan)',  badge: 'cyan'  },
  'MID-CAP':   { color: 'var(--amber)', badge: 'amber' },
  'DEGEN':     { color: 'var(--red)',   badge: 'red'   },
}
const APR_COLOR = (apr: number) => apr < 20 ? 'var(--green)' : apr < 60 ? 'var(--amber)' : 'var(--red)'

// IL curve — computed once, static mathematical relationship
const IL_CURVE = Array.from({ length: 41 }, (_, i) => {
  const ratio = 1 + (i / 20)
  const il    = 2 * Math.sqrt(ratio) / (1 + ratio) - 1
  return { change: `${Math.round((ratio - 1) * 100)}%`, il: Math.abs(il) * 100 }
})

const ILTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(8,11,18,0.96)', border: '1px solid var(--border-accent)',
      borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0 }}>Price Δ {label}</p>
      <p style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700 }}>IL: -{payload[0].value.toFixed(2)}%</p>
    </div>
  )
}

function fmtNum(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ── Pool Health Summary ───────────────────────────────────────────────────────
function PoolHealthBar({ pools }: { pools: Pool[] }) {
  const totalTvl = pools.reduce((acc, p) => acc + p.tvl, 0)
  const avgApr   = pools.reduce((acc, p) => acc + p.aprRaw, 0) / pools.length
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <GlowCard className="p-4" delay={0.1}>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Active Pools</p>
        <MonoValue value={String(pools.length)} color="var(--text-primary)" size="xl" />
      </GlowCard>
      <GlowCard className="p-4" delay={0.2}>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Total TVL</p>
        <MonoValue value={fmtNum(totalTvl)} color="var(--cyan)" size="xl" />
      </GlowCard>
      <GlowCard className="p-4" delay={0.3}>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Avg Fee APR</p>
        <MonoValue value={`${avgApr.toFixed(1)}%`} color={APR_COLOR(avgApr)} size="xl" flash={true} />
      </GlowCard>
    </div>
  )
}

// ── Pool Card ─────────────────────────────────────────────────────────────────
function PoolCard({ pool, i, maxTvl }: { pool: Pool; i: number; maxTvl: number }) {
  const [hovered, setHovered] = useState(false)
  const [aprFlash, setAprFlash] = useState(false)
  const prevApr = useRef(pool.aprRaw)

  useEffect(() => {
    // Only flash if it went up significantly (e.g. tracking drift from engine.getPrevAprs())
    const old = engine.getPrevAprs()[pool.name] ?? prevApr.current
    if (pool.aprRaw > old * 1.01) {
      setAprFlash(true)
      const t = setTimeout(() => setAprFlash(false), 500)
      return () => clearTimeout(t)
    }
    prevApr.current = pool.aprRaw
  }, [pool.aprRaw, pool.name])

  const tier = TIER_STYLE[pool.tier]
  const fmtTvl = fmtNum(pool.tvl)
  const fmtVol = fmtNum(pool.vol24h)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4 transition-all duration-200 relative overflow-hidden cursor-pointer"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      whileHover={{ borderColor: tier.badge === 'cyan' ? 'rgba(0,229,255,0.3)'
        : tier.badge === 'amber' ? 'rgba(245,158,11,0.3)' : 'rgba(255,68,68,0.3)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pool.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', border: '1px solid var(--border-dim)' }}>{pool.version}</span>
          </div>
          <div className="flex gap-1.5 flex-wrap min-h-[22px]">
            <StatBadge label={pool.tier} color={tier.badge} />
            {pool.arb && (
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                className="px-2 py-0.5 rounded text-[8px] font-bold uppercase whitespace-nowrap"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
                  color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                ⚡ ARB
              </motion.span>
            )}
          </div>
        </div>
        <motion.span
          animate={{ color: aprFlash ? '#00ff88' : APR_COLOR(pool.aprRaw) }}
          transition={{ duration: 0.3 }}
          className="text-[10px] font-bold text-right ml-2"
          style={{ fontFamily: 'var(--font-mono)' }}>
          {pool.apr}<br />
          <span style={{ color: 'var(--text-muted)', fontSize: 8 }}>APR</span>
        </motion.span>
      </div>

      {/* TVL bar — live width from engine */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-[9px] uppercase tracking-[0.15em]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TVL</span>
          <span className="text-[10px] font-bold" style={{ color: tier.color, fontFamily: 'var(--font-mono)' }}>{fmtTvl}</span>
        </div>
        <div className="h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <motion.div layout className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(pool.tvl / maxTvl) * 100}%`, background: tier.color, opacity: 0.7 }} />
        </div>
      </div>

      {/* 3-col metrics */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'VOL 24H', value: fmtVol,   color: 'var(--text-secondary)' },
          { label: 'VERSION', value: pool.version, color: 'var(--text-secondary)' },
          { label: 'IMBAL',   value: `${pool.reserveImbalance.toFixed(1)}%`, color: pool.reserveImbalance > 5 ? 'var(--red)' : 'var(--text-secondary)' },
        ].map(m => (
          <div key={m.label}>
            <p className="text-[8px] uppercase tracking-[0.12em] mb-0.5"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</p>
            <p className="text-[10px] font-bold" style={{ color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Enter Position hover button */}
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-4 bottom-4">
            <motion.button initial={{ y: 8 }} animate={{ y: 0 }} exit={{ y: 8 }}
              onClick={() => engine.sendToStrategy(pool.name)}
              className="w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)',
                color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}
              whileHover={{ background: 'rgba(0,229,255,0.2)' }} whileTap={{ scale: 0.97 }}>
              → Add to Strategy
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── IL Calculator ─────────────────────────────────────────────────────────────
function ILCalculator({ pools }: { pools: Pool[] }) {
  const [selectedPool, setSelectedPool] = useState<string>(pools[0]?.name || 'BNB/BUSD')
  const livePriceStr = useLivePrice(selectedPool)
  const initDef = typeof livePriceStr === 'object' ? livePriceStr.price : 300 // fallback
  
  const [initPrice, setInitPrice] = useState(initDef)
  const [curPrice,  setCurPrice]  = useState(initDef * 0.92)
  const [posSize,   setPosSize]   = useState(5000)

  // Auto-fill initPrice on pool change if untouched (simplification: just set on change)
  useEffect(() => {
    setInitPrice(initDef)
    setCurPrice(initDef * 0.92)
  }, [selectedPool, initDef])

  const priceRatio = curPrice / initPrice
  const ilPct      = Math.abs((2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1) * 100)
  const ilUSD      = -(posSize * ilPct / 100)
  const feeIncome  = posSize * 0.0015 * 7
  const netPos     = feeIncome + ilUSD
  const isProfit   = netPos >= 0

  return (
    <GlowCard delay={0.35} className="p-6">
      <div className="flex justify-between items-start mb-5">
        <SectionTitle title="IL Simulator" dotColor="var(--red)" />
        <select
          value={selectedPool} onChange={e => setSelectedPool(e.target.value)}
          className="bg-transparent text-[10px] uppercase font-bold tracking-[0.1em] outline-none cursor-pointer"
          style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(0,229,255,0.3)', paddingBottom: 2 }}>
          {pools.map(p => <option key={p.name} value={p.name} className="bg-[#0b0e14]">{p.name}</option>)}
        </select>
      </div>

      <div className="mt-2 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Initial Price ($)', val: initPrice, set: setInitPrice },
            { label: 'Current Price ($)', val: curPrice,  set: setCurPrice  },
          ].map(inp => (
            <div key={inp.label}>
              <label className="text-[9px] uppercase tracking-[0.2em] block mb-1.5"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{inp.label}</label>
              <input type="number" step="any" value={inp.val}
                onChange={e => inp.set(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-[12px] font-bold outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--border-accent)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border-dim)')} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-[9px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>LP Position Size</label>
            <span className="text-[11px] font-bold" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
              ${posSize.toLocaleString()}
            </span>
          </div>
          <div className="relative h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${(posSize / 10000) * 100}%`, background: 'var(--cyan)', boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
            <input type="range" min={0} max={10000} step={100} value={posSize}
              onChange={e => setPosSize(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-dim)' }}>
          {[
            { label: 'IL', val: `-${ilPct.toFixed(2)}%\n$${Math.abs(ilUSD).toFixed(2)}`, color: 'var(--red)', bg: 'rgba(255,68,68,0.05)', border: 'rgba(255,68,68,0.12)' },
            { label: 'Fee Income', val: `+$${feeIncome.toFixed(2)}\n7-day est.`, color: 'var(--green)', bg: 'rgba(0,255,136,0.05)', border: 'rgba(0,255,136,0.12)' },
            { label: 'Net', val: `${isProfit ? '+' : ''}$${netPos.toFixed(2)}\n${isProfit ? 'Net gain' : 'Net loss'}`,
              color: isProfit ? 'var(--green)' : 'var(--red)',
              bg: isProfit ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.05)',
              border: isProfit ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,68,0.12)' },
          ].map(m => {
            const [main, sub] = m.val.split('\n')
            return (
              <div key={m.label} className="rounded-lg p-3 text-center"
                style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                <p className="text-[8px] uppercase tracking-[0.15em] mb-1"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</p>
                <p className="text-[13px] font-bold" style={{ color: m.color, fontFamily: 'var(--font-mono)' }}>{main}</p>
                <p className="text-[9px]" style={{ color: m.color, fontFamily: 'var(--font-mono)', opacity: 0.7 }}>{sub}</p>
              </div>
            )
          })}
        </div>

        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>IL Curve (price change →)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={IL_CURVE} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="change" stroke="transparent"
                tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 8 }} tickLine={false} interval={9} />
              <YAxis stroke="transparent"
                tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 8 }} tickLine={false}
                tickFormatter={v => `${v.toFixed(0)}%`} />
              <Tooltip content={<ILTooltip />} />
              <Line type="monotone" dataKey="il" stroke="var(--red)" strokeWidth={2} dot={false} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlowCard>
  )
}

// ── Pool Leaderboard ──────────────────────────────────────────────────────────
function PoolLeaderboard({ pools }: { pools: Pool[] }) {
  const sorted = [...pools].sort((a, b) => b.aprRaw - a.aprRaw)
  const maxApr = sorted[0]?.aprRaw ?? 1
  const { isInitializing } = useNexus()

  // Track previous ranks to show movement indicators
  const prevRanks = useRef<Record<string, number>>({})
  const [movements, setMovements] = useState<Record<string, number>>({})

  useEffect(() => {
    const currentRanks: Record<string, number> = {}
    const newMovements: Record<string, number> = {}
    sorted.forEach((p, i) => {
      currentRanks[p.name] = i
      if (prevRanks.current[p.name] !== undefined) {
        newMovements[p.name] = prevRanks.current[p.name] - i
      }
    })
    setMovements(newMovements)
    prevRanks.current = currentRanks
  }, [sorted.map(p => p.name).join()])

  if (isInitializing) {
    return (
      <GlowCard delay={0.4} className="p-6">
        <SectionTitle title="Top Pools by Fee APR" dotColor="var(--purple)" />
        <div className="mt-5"><SkeletonLoader type="row" count={6} /></div>
      </GlowCard>
    )
  }

  return (
    <GlowCard delay={0.4} className="p-6">
      <SectionTitle title="Top Pools by Fee APR" dotColor="var(--purple)" />
      <div className="mt-5 space-y-3 relative">
        <AnimatePresence>
          {sorted.map((pool, i) => {
            const color = APR_COLOR(pool.aprRaw)
            const fmtVol = fmtNum(pool.vol24h)
            const move = movements[pool.name] || 0
            return (
              <motion.div key={pool.name}
                layout // this animates order changes smoothly
                initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 py-2 transition-colors duration-150 rounded-lg px-2 cursor-pointer"
                style={{ borderBottom: '1px solid var(--border-dim)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                {/* Rank & Movement Tag */}
                <div className="w-8 flex flex-col items-center flex-shrink-0">
                  <span className="text-[11px] font-black" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>
                  {move !== 0 && (
                    <span className="text-[7px] font-bold mt-0.5" style={{ color: move > 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                      {move > 0 ? '▲' : '▼'}{Math.abs(move)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{pool.name}</span>
                    <span className="text-[7px] font-bold px-1 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>{pool.version}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${(pool.aprRaw / maxApr) * 100}%`, background: color, boxShadow: `0 0 4px ${color}60` }}
                    />
                  </div>
                </div>

                <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{fmtVol}</span>
                <span className="text-[12px] font-black flex-shrink-0 w-14 text-right" style={{ color, fontFamily: 'var(--font-mono)' }}>{pool.apr}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </GlowCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LiquidityPage() {
  const pools  = usePoolData()
  const maxTvl = Math.max(...pools.map(p => p.tvl), 1)
  const { isInitializing } = useNexus()

  return (
    <div className="space-y-6">
      <PoolHealthBar pools={pools} />

      {/* Pool Map — live from engine */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
          <span className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Active Pools — PancakeSwap V3 / V2
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
          {isInitializing
            ? <SkeletonLoader type="card" count={6} />
            : pools.map((pool, i) => (
                <PoolCard key={pool.name} pool={pool} i={i} maxTvl={maxTvl} />
              ))
          }
        </div>
      </div>

      {/* IL Calc + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ILCalculator pools={pools} />
        <PoolLeaderboard pools={pools} />
      </div>

    </div>
  )
}
