import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import GlowCard from '../components/ui/GlowCard'
import SectionTitle from '../components/ui/SectionTitle'
import MonoValue from '../components/ui/MonoValue'
import SkeletonLoader from '../components/ui/SkeletonLoader'
import {
  useLivePnL, useGasEfficiency, useEquityCurve,
  useStrategyBreakdown, useTradeDist, useNexus,
} from '../context/NexusContext'
import { theme } from '../styles/theme'

// ── useCountUp ────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (from === target) return
    const steps = 40
    const inc   = (target - from) / steps
    let step = 0
    const id = setInterval(() => {
      step++
      setDisplay(parseFloat((from + inc * step).toFixed(2)))
      if (step >= steps) { setDisplay(target); clearInterval(id) }
    }, duration / steps)
    return () => clearInterval(id)
  }, [target, duration])
  return display
}

// ── "Updated X s ago" tracker ─────────────────────────────────────────────────
function useSecondsAgo(): number {
  const [secs, setSecs] = useState(0)
  const lastUpdate = useRef(Date.now())
  // Reset timer whenever equityCurve updates
  const curve = useEquityCurve()
  useEffect(() => { lastUpdate.current = Date.now(); setSecs(0) }, [curve.length, curve[curve.length - 1]?.time])
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.floor((Date.now() - lastUpdate.current) / 1000)), 500)
    return () => clearInterval(id)
  }, [])
  return secs
}

// ── Tooltips ──────────────────────────────────────────────────────────────────
const EquityTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(8,11,18,0.96)', border: '1px solid var(--border-accent)',
      borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 12, fontWeight: 700, margin: '2px 0' }}>
          {p.name}: ${p.value?.toFixed(2)}
        </p>
      ))}
    </div>
  )
}
const DistTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(8,11,18,0.96)', border: '1px solid var(--border-accent)',
      borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>{label}</p>
      <p style={{ color: payload[0].fill, fontSize: 13, fontWeight: 700 }}>{payload[0].value} trades</p>
    </div>
  )
}

function WinDonut({ value }: { value: number }) {
  const data = [{ v: value }, { v: 100 - value }]
  return (
    <PieChart width={64} height={64}>
      <Pie data={data} cx={28} cy={28} innerRadius={20} outerRadius={28}
        startAngle={90} endAngle={-270} stroke="none" dataKey="v">
        <Cell fill="var(--cyan)" />
        <Cell fill={theme.chart.emptyFill} />
      </Pie>
    </PieChart>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type Range = '1D' | '7D' | '30D'
const RANGE_POINTS: Record<Range, number> = { '1D': 50, '7D': 150, '30D': 200 }

export default function PortfolioPage() {
  const [range, setRange]   = useState<Range>('7D')
  const pnl                = useLivePnL()
  const gasEfficiency      = useGasEfficiency()
  const equityCurve        = useEquityCurve()
  const strategyBreakdown  = useStrategyBreakdown()
  const tradeDistribution  = useTradeDist()
  const secsAgo            = useSecondsAgo()
  const { isInitializing } = useNexus()

  // Filtered equity window based on range
  const chartData = useMemo(() => {
    const pts = RANGE_POINTS[range]
    return equityCurve.slice(-pts)
  }, [equityCurve, range])

  // Live metric values (with count-up)
  const displayTotal   = useCountUp(pnl.total)
  const displayWinRate = useCountUp(pnl.winRate)
  const avgProfit      = pnl.tradeCount > 0 ? parseFloat((pnl.total / pnl.tradeCount).toFixed(2)) : 0
  const displayAvg     = useCountUp(avgProfit)
  const displayGas     = useCountUp(gasEfficiency)

  // Strategy breakdown — highlight max netPnL row
  const maxNetPnL = Math.max(...strategyBreakdown.map(r => r.netPnL))

  const bucketColor = (profit: boolean | null) =>
    profit === null ? 'var(--cyan)' : profit ? 'var(--green)' : 'var(--red)'

  return (
    <div className="space-y-6">

      {/* ── Equity Curve ── */}
      <GlowCard delay={0} className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionTitle title="Portfolio Equity Curve" dotColor="var(--cyan)" />
            <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Updated {secsAgo}s ago
            </p>
          </div>
          {/* Range selector — inline on md+, full-width wrap on mobile */}
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {(['1D', '7D', '30D'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className="flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] transition-all"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: range === r ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color:      range === r ? 'var(--cyan)' : 'var(--text-muted)',
                  border:     range === r ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--border-dim)',
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Chart area */}
        {isInitializing || chartData.length === 0
          ? <SkeletonLoader type="chart" className="mt-4" />
          : <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={theme.chart.line1} stopOpacity={0.35} />
                <stop offset="100%" stopColor={theme.chart.line1} stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="purpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={theme.chart.line2} stopOpacity={0.2} />
                <stop offset="100%" stopColor={theme.chart.line2} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.chart.grid} vertical={false} />
            <XAxis dataKey="time" stroke="transparent"
              tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              tickLine={false} interval={Math.floor(chartData.length / 6)} />
            <YAxis stroke="transparent"
              tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} domain={['auto', 'auto']} />
            <Tooltip content={<EquityTooltip />} />
            <Area type="monotone" dataKey="benchmark" name="Benchmark"
              stroke={theme.chart.line2} strokeWidth={2} strokeDasharray="6 4" fill="url(#purpGrad)"
              isAnimationActive={false} />
            <Area type="monotone" dataKey="totalPnL" name="Total Return"
              stroke={theme.chart.line1} strokeWidth={2.5} fill="url(#cyanGrad)"
              isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>}
      </GlowCard>

      {/* ── Performance Metrics — 2×2 grid on mobile, 4-col on md+ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Return */}
        <GlowCard delay={0.1} className="p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Total Return</p>
          <MonoValue
            value={`${displayTotal >= 0 ? '+' : ''}$${Math.abs(displayTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color={displayTotal >= 0 ? 'var(--green)' : 'var(--red)'} size="xl" flash={true} />
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {pnl.tradeCount} total trades
          </p>
        </GlowCard>

        {/* Win Rate */}
        <GlowCard delay={0.2} className="p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Win Rate</p>
          <div className="flex items-center gap-3">
            <WinDonut value={displayWinRate} />
            <MonoValue value={`${displayWinRate.toFixed(1)}%`} color="var(--cyan)" size="xl" flash={true} />
          </div>
        </GlowCard>

        {/* Avg Profit / Trade */}
        <GlowCard delay={0.3} className="p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Avg Profit / Trade</p>
          <MonoValue
            value={`${displayAvg >= 0 ? '+' : ''}$${Math.abs(displayAvg).toFixed(2)}`}
            color="var(--text-primary)" size="xl" flash={true} />
          <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            computed live
          </p>
        </GlowCard>

        {/* Gas Efficiency */}
        <GlowCard delay={0.4} className="p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Gas Efficiency</p>
          <MonoValue value={`${displayGas.toFixed(1)}%`} color="var(--amber)" size="xl" flash={true} />
          <div className="mt-3 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div layout className="h-full rounded-full transition-all duration-700"
              style={{ width: `${displayGas}%`, background: 'var(--amber)', boxShadow: '0 0 6px rgba(245,158,11,0.5)' }} />
          </div>
        </GlowCard>
      </div>

      {/* ── Strategy Breakdown + Trade Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* Strategy Breakdown */}
        <GlowCard delay={0.3} className="p-6 lg:col-span-6">
          <SectionTitle title="Strategy Breakdown" dotColor="var(--purple)" />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  {['Strategy','Trades','Win %','Gross PNL','Gas Cost','Net PNL','Sharpe'].map(c => (
                    <th key={c}
                      className={`pb-3 text-left text-[9px] font-bold uppercase tracking-[0.2em] pr-4${
                        c === 'Gas Cost' || c === 'Sharpe' ? ' hidden md:table-cell' : ''
                      }`}
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {strategyBreakdown.map((row, i) => {
                  const isTop = row.netPnL === maxNetPnL
                  return (
                    <motion.tr key={row.name}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.08 }}
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        borderLeft: isTop ? '2px solid var(--cyan)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="py-3.5 pl-2 pr-4 text-[11px] font-semibold"
                        style={{ color: isTop ? 'var(--cyan)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{row.name}</td>
                      <td className="py-3.5 pr-4 text-[11px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.trades}</td>
                      <td className="py-3.5 pr-4 text-[11px]" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{row.winPct}</td>
                      <td className="py-3.5 pr-4 text-[11px] hidden md:table-cell" style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>${row.grossPnL.toFixed(2)}</td>
                      <td className="py-3.5 pr-4 text-[11px] hidden md:table-cell" style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>${row.gasCost.toFixed(2)}</td>
                      <td className="py-3.5 pr-4 text-[11px] font-bold" style={{ color: row.netPnL >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                        {row.netPnL >= 0 ? '+' : ''}${row.netPnL.toFixed(2)}
                      </td>
                      <td className="py-3.5 pr-4 hidden md:table-cell">
                        <span className="text-[11px] font-bold"
                          style={{ color: row.sharpe >= 2 ? 'var(--cyan)' : row.sharpe >= 1.5 ? 'var(--amber)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                          {row.sharpe.toFixed(2)}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlowCard>

        {/* Trade Distribution Histogram */}
        <GlowCard delay={0.4} className="p-6 lg:col-span-4">
          <SectionTitle title="PNL Distribution" dotColor="var(--magenta)" />
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tradeDistribution} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="bucket" stroke="transparent"
                  tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} />
                <YAxis stroke="transparent"
                  tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} />
                <Tooltip content={<DistTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {tradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`}
                      fill={bucketColor(entry.profit)}
                      fillOpacity={0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { color: 'var(--green)', label: 'Profitable' },
              { color: 'var(--cyan)',  label: 'Breakeven'  },
              { color: 'var(--red)',   label: 'Loss'       },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
                <span className="text-[9px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

    </div>
  )
}
