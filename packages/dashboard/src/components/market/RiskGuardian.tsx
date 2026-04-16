import React from 'react'
import { motion } from 'framer-motion'
import { useNexus, useRiskMetrics } from '../../context/NexusContext'
import { theme } from '../../styles/theme'

// ── Dual-track slider ─────────────────────────────────────────────────────────
// Shows: cyan filled track up to LIMIT (user-set), white/amber/red marker at CURRENT (engine)
interface DualTrackSliderProps {
  label:    string
  limit:    number          // user-controlled ceiling
  current:  number          // engine live value
  max:      number
  onChange: (v: number) => void
  step?:    number
}

function DualTrackSlider({ label, limit, current, max, onChange, step = 0.1 }: DualTrackSliderProps) {
  const limitPct   = Math.min(100, (limit   / max) * 100)
  const currentPct = Math.min(100, (current / max) * 100)
  const ratio      = limit > 0 ? current / limit : 0

  // Marker color: green → amber → red → pulsing red
  const markerColor = ratio > 0.95 ? 'var(--red)' : ratio > 0.8 ? 'var(--amber)' : 'rgba(255,255,255,0.85)'
  const isAlert     = ratio > 0.95
  const isWarn      = ratio > 0.8 && !isAlert

  const fmt = (v: number) => v.toFixed(step < 1 ? 1 : 0)

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          CURRENT:{' '}
          <motion.span
            animate={isAlert ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ color: markerColor, fontWeight: 700 }}>
            {fmt(current)}
          </motion.span>
          {' '}|{' '}
          LIMIT: <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{fmt(limit)}</span>
        </span>
      </div>

      {/* Track */}
      <div className="relative h-[4px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Cyan fill — up to LIMIT position */}
        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-150"
          style={{ width: `${limitPct}%`, background: 'var(--cyan)', boxShadow: `0 0 8px ${theme.glow.track}` }} />

        {/* Current value marker — vertical bar */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-[3px] h-[10px] rounded-full"
          style={{ left: `calc(${currentPct}% - 1.5px)`, background: markerColor,
            boxShadow: `0 0 6px ${markerColor}` }}
          animate={isAlert ? { opacity: [1, 0.3, 1], scaleY: [1, 1.3, 1] } : isWarn ? { opacity: [1, 0.6, 1] } : {}}
          transition={{ duration: 0.6, repeat: Infinity }}
        />

        {/* Invisible range input controls LIMIT thumb */}
        <div className="absolute top-[-6px] left-0 w-full h-[16px]">
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 pointer-events-none transition-all duration-75"
            style={{ left: `calc(${limitPct}% - 6px)`, background: 'var(--bg-primary)',
              borderColor: 'var(--cyan)', boxShadow: `0 0 10px ${theme.glow.thumb}` }} />
          <input type="range" min={0} max={max} step={step} value={limit}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer" style={{ margin: 0 }} />
        </div>
      </div>

      {/* Alert label */}
      {isAlert && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[8px] uppercase tracking-[0.25em]"
          style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          ⚠ APPROACHING LIMIT
        </motion.p>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RiskGuardian() {
  const { riskLimits, setRiskLimits, armed, toggleArmed } = useNexus()
  const risk = useRiskMetrics()

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl p-5 space-y-6"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}
    >
      {/* Title */}
      <div className="flex items-center gap-2">
        <motion.span
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: armed ? 3 : 0.8, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: armed ? 'var(--green)' : 'var(--red)',
            boxShadow: armed ? '0 0 6px var(--green)' : '0 0 10px var(--red)' }} />
        <span className="text-xs font-bold uppercase tracking-[0.25em]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Risk Guardian</span>
        {!armed && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.7, repeat: Infinity }}
            className="ml-auto text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded"
            style={{ background: 'rgba(255,68,68,0.12)', border: `1px solid rgba(255,68,68,0.35)`,
              color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
            PAUSED
          </motion.span>
        )}
      </div>

      {/* Dual-track sliders — LIMIT (user) + CURRENT (live engine) */}
      <div className="space-y-6">
        <DualTrackSlider
          label="Drawdown Limit"
          limit={riskLimits.drawdownLimit}
          current={risk.drawdown}
          max={15} step={0.1}
          onChange={v => setRiskLimits({ drawdownLimit: v })} />

        <DualTrackSlider
          label="Max Position Size"
          limit={riskLimits.positionSize}
          current={risk.positionSize}
          max={500} step={5}
          onChange={v => setRiskLimits({ positionSize: v })} />

        <DualTrackSlider
          label="Anomaly Threshold"
          limit={riskLimits.anomalyScore}
          current={risk.anomaly}
          max={100} step={1}
          onChange={v => setRiskLimits({ anomalyScore: v })} />
      </div>

      {/* ARMED / DISARMED toggle */}
      <motion.button
        onClick={toggleArmed}
        whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${armed ? theme.glow.success : theme.glow.danger}` }}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-[0.35em] transition-all"
        style={{
          background:  armed ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.08)',
          border:      `1px solid ${armed ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.5)'}`,
          color:       armed ? 'var(--green)' : 'var(--red)',
          fontFamily:  'var(--font-mono)',
          boxShadow:   `0 0 ${armed ? `12px ${theme.glow.success}` : `16px ${theme.glow.danger}`}`,
        }}
        animate={!armed ? { boxShadow: [`0 0 16px ${theme.glow.dangerPulse}`, `0 0 28px ${theme.glow.dangerPeak}`, `0 0 16px ${theme.glow.dangerPulse}`] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        ● {armed ? 'ARMED' : 'DISARMED'}
      </motion.button>
    </motion.div>
  )
}
