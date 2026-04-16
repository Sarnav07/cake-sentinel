import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLivePnL, useIsInitializing } from '../context/NexusContext'
import { theme } from '../styles/theme'

// ── Canvas Particle Network ───────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let W = window.innerWidth, H = window.innerHeight

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', e => { mouse.current = { x: e.clientX, y: e.clientY } })

    type Node = { x: number; y: number; vx: number; vy: number; r: number }
    const nodes: Node[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 2,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, W, H)
      for (const n of nodes) {
        const dx = mouse.current.x - n.x
        const dy = mouse.current.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200) { n.vx += dx / dist * 0.04; n.vy += dy / dist * 0.04 }
        n.vx *= 0.995; n.vy *= 0.995
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 150) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(0,229,255,${(1 - d / 150) * 0.15})`
            ctx.lineWidth = 0.8; ctx.stroke()
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = theme.accent.primary; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ── CountUp ────────────────────────────────────────────────────────────────────
function CountUp({ target, prefix = '', suffix = '', duration = 1500 }: { target: number; prefix?: string; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <span>{prefix}{val.toLocaleString()}{suffix}</span>
}

// ── Boot Sequence ─────────────────────────────────────────────────────────────
const BOOT_LINES = [
  '> Connecting to BSC Testnet...',
  '> Loading market state graph...',
  '> Initializing 7 agents...',
  '> Risk Guardian armed...',
  '> NEXUS ONLINE',
]
const CHECK = '  ✓'

function BootSequence({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Show each line with 300ms spacing
    const timers: ReturnType<typeof setTimeout>[] = []
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(i + 1)
        if (i === BOOT_LINES.length - 1) {
          // After last line, wait 0.5s then navigate
          timers.push(setTimeout(() => { setDone(true); onDone() }, 500))
        }
      }, 400 + i * 320))
    })
    return () => timers.forEach(clearTimeout)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-start gap-1.5 font-mono text-sm"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {BOOT_LINES.map((line, i) => (
        <AnimatePresence key={i}>
          {visibleLines > i && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2"
            >
              <span style={{
                color: line === '> NEXUS ONLINE'
                  ? 'var(--cyan)'
                  : theme.text.white65,
                fontWeight: line === '> NEXUS ONLINE' ? 800 : 400,
                fontSize: line === '> NEXUS ONLINE' ? 18 : 13,
                letterSpacing: line === '> NEXUS ONLINE' ? '0.2em' : '0.05em',
                textShadow: line === '> NEXUS ONLINE' ? `0 0 20px ${theme.glow.thumb}` : 'none',
              }}>
                {line}
              </span>
              {line !== '> NEXUS ONLINE' && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  style={{ color: 'var(--green)', fontSize: 12 }}
                >
                  {CHECK}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      ))}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const NEXUS_LETTERS = 'NEXUS'.split('')

export default function LandingPage() {
  const navigate = useNavigate()
  const pnl = useLivePnL()
  const isInitializing = useIsInitializing()

  // Boot phase: show typewriter during isInitializing, then show normal landing
  const [bootDone, setBootDone] = useState(false)

  const STATS = [
    { label: 'Active Agents',   value: 7,                   prefix: '',   suffix: '' },
    { label: 'Trades Today',    value: pnl.tradeCount,      prefix: '',   suffix: '' },
    { label: 'Net PNL',         value: Math.abs(pnl.total), prefix: '+$', suffix: '' },
  ]

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'var(--bg-primary)' }}>

      <ParticleCanvas />

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${theme.glow.card} 0%, transparent 70%)`
      }} />

      {/* ── Boot sequence overlay ── */}
      <AnimatePresence mode="wait">
        {isInitializing && !bootDone && (
          <motion.div
            key="boot"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 flex flex-col items-center gap-8"
          >
            {/* Small NEXUS wordmark above boot log */}
            <div className="flex items-center gap-1" style={{ gap: '0.03em' }}>
              {NEXUS_LETTERS.map((c, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    fontSize: 42, fontWeight: 900, color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em',
                    textShadow: '0 0 20px rgba(0,229,255,0.6)',
                  }}>{c}</motion.span>
              ))}
            </div>

            {/* Boot log box */}
            <div className="rounded-xl p-6 min-w-[360px]"
              style={{ background: theme.bg.boot, border: `1px solid ${theme.border.faint}`, backdropFilter: 'blur(20px)' }}>
              <BootSequence onDone={() => {
                setBootDone(true)
                // Auto-navigate to /market after boot sequence finishes
                setTimeout(() => navigate('/market'), 500)
              }} />
            </div>
          </motion.div>
        )}

        {/* ── Normal landing (shown after boot, or when user revisits) ── */}
        {(!isInitializing || bootDone) && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-6 text-center px-6"
          >
            {/* LIVE badge */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ background: `rgba(0,255,136,0.06)`, border: `1px solid rgba(0,255,136,0.2)` }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent.success }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ color: theme.accent.success, fontFamily: 'var(--font-mono)' }}>
                Live • BSC Testnet
              </span>
            </motion.div>

            {/* NEXUS letters */}
            <div className="flex items-center" style={{ gap: '0.04em' }}>
              {NEXUS_LETTERS.map((char, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    fontSize: 'clamp(72px, 12vw, 120px)', fontWeight: 900,
                    letterSpacing: '-0.04em', color: 'var(--cyan)',
                    fontFamily: 'var(--font-mono)',
                    textShadow: `0 0 40px ${theme.glow.thumb}, 0 0 80px ${theme.glow.strong}`,
                    lineHeight: 1,
                  }}>{char}
                </motion.span>
              ))}
            </div>

            {/* Subtitle */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
              className="text-sm md:text-base tracking-[0.2em] uppercase"
              style={{ color: 'var(--cyan-dim)', fontFamily: 'var(--font-mono)', maxWidth: 480 }}>
              Autonomous Multi-Agent Trading System
            </motion.p>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              onClick={() => navigate('/market')}
              whileHover={{ backgroundColor: theme.accent.primary, color: theme.bg.base, scale: 1.02, boxShadow: `0 0 30px ${theme.glow.strong}` }}
              whileTap={{ scale: 0.97 }}
              className="mt-4 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-[0.3em] transition-all duration-200"
              style={{ border: '1px solid var(--cyan)', color: 'var(--cyan)', background: 'transparent', fontFamily: 'var(--font-mono)' }}>
              Enter Dashboard →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom stat strip — hidden during boot */}
      {(!isInitializing || bootDone) && (
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
          style={{ borderTop: '1px solid var(--border-dim)' }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center px-10 py-5"
              style={{ borderRight: i < STATS.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
              <span className="text-[11px] uppercase tracking-[0.25em] mb-1"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {stat.label}
              </span>
              <span className="text-xl font-bold" style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                <CountUp target={stat.value} prefix={stat.prefix} suffix={stat.suffix} duration={1200 + i * 200} />
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
