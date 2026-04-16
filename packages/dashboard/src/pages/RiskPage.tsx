import React from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, ReferenceLine,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from 'recharts'
import RiskGuardian from '../components/market/RiskGuardian'
import {
  useNexus,
  useDrawdownHistory,
  useCircuitBreakers,
  usePositionExposure,
  useRiskMetrics,
} from '../context/NexusContext'

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, tripped }: { on: boolean; onToggle: () => void; tripped?: boolean }) {
  return (
    <div className="relative">
      {/* Pulsing red ring when tripped */}
      {tripped && (
        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid var(--red)', pointerEvents: 'none' }} />
      )}
      <button onClick={onToggle}
        className="relative w-10 h-5 rounded-full transition-all duration-300 flex-shrink-0"
        style={{
          background:  on ? 'rgba(0,229,255,0.2)' : 'rgba(255,68,68,0.15)',
          border:      on ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,68,68,0.4)',
          boxShadow:   on ? '0 0 8px rgba(0,229,255,0.3)' : '0 0 8px rgba(255,68,68,0.2)',
        }}>
        <motion.div animate={{ x: on ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{ background: on ? 'var(--cyan)' : 'var(--red)',
            boxShadow: on ? '0 0 6px var(--cyan)' : '0 0 6px var(--red)' }} />
      </button>
    </div>
  )
}

// ── Circuit Breakers ──────────────────────────────────────────────────────────
function CircuitBreakerPanel() {
  const { circuitBreakers, setCircuitBreakers } = useCircuitBreakers()

  const LABELS: { key: keyof typeof circuitBreakers; label: string }[] = [
    { key: 'maxDrawdown', label: 'Max Drawdown 15%'      },
    { key: 'flashCrash',  label: 'Flash Crash Detection' },
    { key: 'oracleGuard', label: 'Oracle Failure Guard'  },
    { key: 'depegAlert',  label: 'Depeg Alert'           },
  ]

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl p-5 space-y-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Circuit Breakers</span>
      </div>

      <div className="space-y-4">
        {LABELS.map(({ key, label }) => {
          const on      = circuitBreakers[key]
          const tripped = !on && key === 'flashCrash' // pulsing ring only on auto-tripped flashCrash
          return (
            <div key={key} className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <div>
                <p className="text-[11px] font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{label}</p>
                <p className="text-[9px] mt-0.5 uppercase tracking-[0.15em]"
                  style={{ color: on ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                  {on ? '● ARMED' : '○ TRIPPED'}
                </p>
              </div>
              <Toggle on={on} onToggle={() => setCircuitBreakers({ [key]: !on })} tripped={tripped} />
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ── Drawdown Chart ────────────────────────────────────────────────────────────
function DrawdownChart() {
  const history    = useDrawdownHistory()
  const { riskLimits } = useNexus()
  const risk       = useRiskMetrics()
  const limit      = -riskLimits.drawdownLimit
  const current    = history[history.length - 1]?.value ?? 0
  const breached   = current < limit

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      {/* Header + optional warning badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--red)', boxShadow: '0 0 6px var(--red)' }} />
          <span className="text-xs font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Drawdown History</span>
        </div>
        {breached && (
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}
            className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-[0.2em]"
            style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)',
              border: '1px solid rgba(245,158,11,0.35)', fontFamily: 'var(--font-mono)' }}>
            ⚠ LIMIT BREACHED
          </motion.span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={history} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ff4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ff4444" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="transparent"
            tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
            tickLine={false} tickFormatter={v => `${v}%`} />
          {/* Dynamic reference line at user's drawdown limit — amber if breached */}
          <ReferenceLine y={limit}
            stroke={breached ? 'rgba(245,158,11,0.6)' : 'rgba(255,68,68,0.4)'}
            strokeDasharray="4 4"
            label={{
              value: `MAX ${limit}%`,
              fill:  breached ? 'rgba(245,158,11,0.8)' : 'rgba(255,68,68,0.6)',
              fontFamily: 'var(--font-mono)', fontSize: 9,
            }} />
          <Tooltip
            formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']}
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
              borderRadius: 8, fontFamily: 'var(--font-mono)', color: 'var(--red)' }} />
          <Area type="monotone" dataKey="value" stroke="#ff4444" strokeWidth={1.5}
            fill="url(#ddGrad)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ── Position Exposure ─────────────────────────────────────────────────────────
function ExposureTable() {
  const exposure = usePositionExposure()
  const RISK_COLOR = { LOW: 'var(--green)', MEDIUM: 'var(--amber)', HIGH: 'var(--red)' }
  const RISK_BG    = {
    LOW:    { bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.2)'  },
    MEDIUM: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    HIGH:   { bg: 'rgba(255,68,68,0.08)',  border: 'rgba(255,68,68,0.2)'  },
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>

      <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <span className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Position Exposure</span>
      </div>

      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
            {['Token','Exposure','% Portfolio','Risk Level'].map(c => (
              <th key={c} className="px-5 py-3 text-left text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {exposure.map((row, i) => (
            <motion.tr key={row.token}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              style={{ borderBottom: '1px solid var(--border-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

              <td className="px-5 py-3.5 text-[12px] font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{row.token}</td>
              <td className="px-5 py-3.5 text-[11px]"
                style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{row.exposure}</td>
              <td className="px-5 py-3.5 text-[11px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.portfolioPct}</td>
              <td className="px-5 py-3.5">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color:      RISK_COLOR[row.riskLevel],
                    background: RISK_BG[row.riskLevel].bg,
                    border: `1px solid ${RISK_BG[row.riskLevel].border}`,
                  }}>
                  {row.riskLevel}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

// ── Risk Metrics cards (live from engine) ─────────────────────────────────────
function RiskMetricsCards() {
  const risk = useRiskMetrics()
  const metrics = [
    { label: 'Sharpe Ratio', value: risk.sharpe.toFixed(2),       color: 'var(--cyan)'   },
    { label: 'Max Drawdown', value: `-${risk.drawdown.toFixed(1)}%`, color: 'var(--red)'    },
    { label: 'Anomaly Score',value: risk.anomaly.toFixed(0),       color: 'var(--magenta)' },
    { label: 'Pos. Size $',  value: `$${risk.positionSize.toFixed(0)}`, color: 'var(--amber)'  },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {metrics.map((m, i) => (
        <motion.div key={m.label}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08 }}
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
          <p className="text-[9px] uppercase tracking-[0.2em] mb-2"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.label}</p>
          <p className="text-[20px] font-black leading-none"
            style={{ color: m.color, fontFamily: 'var(--font-mono)' }}>{m.value}</p>
        </motion.div>
      ))}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RiskPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

      {/* Left column */}
      <div className="space-y-5">
        <RiskGuardian />
        <DrawdownChart />
        <ExposureTable />
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <CircuitBreakerPanel />
        <RiskMetricsCards />
      </div>

    </div>
  )
}
