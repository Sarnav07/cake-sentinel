import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useNexus, useSignals, useMarketRegime, useStrategyPerformance } from '../context/NexusContext'
import { SkeletonRow } from '../components/shared/SkeletonLoader'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import type { Signal, RegimeLabel } from '../data/MockDataEngine'

// ── Style maps ────────────────────────────────────────────────────────────────
const STRATEGY_BADGE: Record<string, React.CSSProperties> = {
  'ARBITRAGE':      { background: 'rgba(0,229,255,0.1)',  border: '1px solid rgba(0,229,255,0.25)',  color: '#00e5ff' },
  'TREND':          { background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#a855f7' },
  'MEAN-REVERSION': { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' },
}
const RISK_COLORS = ['', 'var(--green)', 'var(--cyan)', 'var(--amber)', 'var(--magenta)', 'var(--red)']

const REGIME_CONFIG: Record<RegimeLabel, { color: string; glow: string }> = {
  'TRENDING':       { color: 'var(--cyan)',    glow: 'rgba(0,229,255,0.8)'   },
  'MEAN-REVERTING': { color: 'var(--purple)',  glow: 'rgba(168,85,247,0.8)'  },
  'HIGH-VOLATILITY':{ color: 'var(--red)',     glow: 'rgba(255,68,68,0.8)'   },
  'CHOPPY':         { color: 'var(--amber)',   glow: 'rgba(245,158,11,0.8)'  },
}

// ── Signal Card ───────────────────────────────────────────────────────────────
function SignalCard({ s, i, flash }: { s: Signal; i: number; flash: boolean }) {
  const { demo, armed } = useNexus()
  const profit = s.expectedProfit
  const [executing, setExecuting] = useState(false)

  const handleExecute = async () => {
    if (!armed || executing) return
    setExecuting(true)
    await demo.executeSignal(s)
    setTimeout(() => setExecuting(false), 1000)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30 }}
      animate={{
        opacity: 1, x: 0,
        backgroundColor: flash ? 'rgba(0,229,255,0.06)' : 'transparent',
      }}
      transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
      whileHover={{ borderColor: 'var(--border-accent)', background: 'var(--bg-card-hover)' }}
    >
      {/* Row 1: pair + strategy badge + expected profit */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {s.pair}
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-mono)', ...STRATEGY_BADGE[s.strategy] }}>
            {s.strategy}
          </span>
        </div>
        <span className="text-[15px] font-bold"
          style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
        </span>
      </div>

      {/* Row 2: confidence bar + risk dots */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Confidence</span>
            <span className="text-[10px] font-bold"
              style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{s.confidence}%</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div layout className="h-full rounded-full"
              style={{ width: `${s.confidence}%`, background: 'var(--cyan)', boxShadow: '0 0 6px rgba(0,229,255,0.5)' }} />
          </div>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-[0.18em] block mb-1.5"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Risk</span>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(d => (
              <div key={d} className="w-3 h-3 rounded-sm"
                style={{ background: d <= s.riskScore ? RISK_COLORS[s.riskScore] : 'rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: entry / target + execute button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-4">
          <div>
            <span className="text-[9px] block mb-0.5 uppercase tracking-[0.15em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Entry</span>
            <span className="text-[11px] font-bold"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ${typeof s.entryPrice === 'number' ? s.entryPrice.toFixed(s.entryPrice < 10 ? 4 : 2) : s.entryPrice}
            </span>
          </div>
          <div>
            <span className="text-[9px] block mb-0.5 uppercase tracking-[0.15em]"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Target</span>
            <span className="text-[11px] font-bold"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ${typeof s.exitPrice === 'number' ? s.exitPrice.toFixed(s.exitPrice < 10 ? 4 : 2) : s.exitPrice}
            </span>
          </div>
        </div>
        <motion.button
          onClick={handleExecute}
          disabled={!armed || executing}
          whileHover={{ background: 'rgba(0,229,255,0.15)', boxShadow: '0 0 12px rgba(0,229,255,0.3)' }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
          style={{ border: '1px solid rgba(0,229,255,0.35)', color: executing || !armed ? 'var(--text-muted)' : 'var(--cyan)',
            fontFamily: 'var(--font-mono)', background: 'transparent',
            opacity: (!armed || executing) ? 0.5 : 1, cursor: (!armed || executing) ? 'not-allowed' : 'pointer' }}>
          {executing ? 'Executing...' : 'Execute'}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Signal Feed ───────────────────────────────────────────────────────────────
function SignalFeed() {
  const signals = useSignals()
  const { isInitializing } = useNexus()
  const prevLen  = useRef(signals.length)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (signals.length !== prevLen.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 600)
      prevLen.current = signals.length
      return () => clearTimeout(t)
    }
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 600)
    return () => clearTimeout(t)
  }, [signals])

  if (isInitializing) return <SkeletonLoader type="card" count={4} />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Active Signals</span>
        <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold"
          style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--cyan)',
            fontFamily: 'var(--font-mono)', border: '1px solid rgba(0,229,255,0.2)' }}>
          {signals.length} LIVE
        </span>
      </div>

      {/* Cards */}
      <AnimatePresence>
        {signals.map((s, i) => (
          <SignalCard key={s.id} s={s} i={i} flash={flash} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Regime Detector ─────────────────────────────────────────────────────────
function RegimeDetector() {
  const { regime, history } = useMarketRegime()
  const cfg = REGIME_CONFIG[regime.current]

  // small volatile sparkline data — re-generates on each render for life
  const volData = Array.from({ length: 20 }, (_, i) => ({
    v: 12 + Math.sin(i / 3) * 4 + Math.random() * 2,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="rounded-xl p-5 space-y-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Market Regime</span>
      </div>

      {/* Current regime — key triggers re-animation on change */}
      <div className="text-center py-6 rounded-xl"
        style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}>
        <p className="text-[10px] uppercase tracking-[0.3em] mb-2"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Current</p>

        <AnimatePresence mode="wait">
          <motion.p
            key={regime.current}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{
              opacity: 1, y: 0, filter: 'blur(0px)',
              textShadow: [`0 0 8px ${cfg.glow}`, `0 0 22px ${cfg.glow}`, `0 0 8px ${cfg.glow}`],
            }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, textShadow: { duration: 3, repeat: Infinity } }}
            className="text-[20px] font-black tracking-[0.15em]"
            style={{ color: cfg.color, fontFamily: 'var(--font-mono)' }}
          >
            {regime.current}
          </motion.p>
        </AnimatePresence>

        <p className="text-[9px] mt-2 uppercase tracking-[0.15em]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {regime.confidence}% confidence · {regime.updatedAt}
        </p>
      </div>

      {/* History */}
      <div className="space-y-2">
        <p className="text-[9px] uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>History</p>
        {history.map((r, i) => {
          const rc = REGIME_CONFIG[r.regime]
          return (
            <div key={`${r.regime}-${i}`} className="flex justify-between items-center py-1.5"
              style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: rc.color }} />
                <span className="text-[11px] font-bold"
                  style={{ color: i === 0 ? rc.color : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {r.regime}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.duration}</span>
                <span className="text-[9px]"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{r.timestamp}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Volatility sparkline */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Volatility Index</span>
          <span className="text-[14px] font-bold"
            style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
            {(12 + Math.random() * 4).toFixed(1)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={40}>
          <AreaChart data={volData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5}
              fill="url(#volGrad)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

// ── Strategy Performance Table ────────────────────────────────────────────────
function StrategyPerformanceTable() {
  const perf = useStrategyPerformance()
  const { isInitializing } = useNexus()

  if (isInitializing) {
    return (
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', padding: 20 }}>
        <SkeletonLoader type="row" count={3} />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <span className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Strategy Performance
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
            {['Strategy', 'Trades', 'Win %', 'Avg Profit', 'Total PNL', 'Status'].map(c => (
              <th key={c} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Skeleton while empty */}
          {(!perf || perf.length === 0) && [0, 1, 2].map(i => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <td colSpan={6} className="px-5 py-3">
                <SkeletonRow cols={6} />
              </td>
            </tr>
          ))}

          {perf && perf.map((row, i) => (
            <motion.tr key={row.name}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + i * 0.07 }}
              style={{ borderBottom: '1px solid var(--border-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

              <td className="px-5 py-3.5 text-[12px] font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{row.name}</td>

              <td className="px-5 py-3.5 text-[12px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.trades}</td>

              <td className="px-5 py-3.5 text-[12px]"
                style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{row.winPct}</td>

              <td className="px-5 py-3.5 text-[12px]"
                style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{row.avgProfit}</td>

              <td className="px-5 py-3.5 text-[12px] font-bold"
                style={{ color: row.total.startsWith('+') ? 'var(--green)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)' }}>{row.total}</td>

              <td className="px-5 py-3.5">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: row.status === 'ACTIVE' ? 'rgba(0,255,136,0.08)' : 'rgba(245,158,11,0.08)',
                    color:      row.status === 'ACTIVE' ? 'var(--green)' : 'var(--amber)',
                    border: `1px solid ${row.status === 'ACTIVE' ? 'rgba(0,255,136,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  }}>
                  {row.status}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StrategyPage() {
  const [showPerf, setShowPerf] = useState(false)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">
        <SignalFeed />
        <RegimeDetector />
      </div>

      {/* Performance — always shown on md+; collapsible toggle on mobile */}
      <div>
        <button
          className="md:hidden w-full flex items-center justify-between px-5 py-3 rounded-xl mb-2"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}
          onClick={() => setShowPerf(v => !v)}
        >
          <span className="uppercase tracking-[0.2em] font-bold">Show Performance</span>
          <motion.span animate={{ rotate: showPerf ? 180 : 0 }} transition={{ duration: 0.2 }}>▼</motion.span>
        </button>
        <div className="hidden md:block"><StrategyPerformanceTable /></div>
        {showPerf && <div className="md:hidden"><StrategyPerformanceTable /></div>}
      </div>
    </div>
  )
}
