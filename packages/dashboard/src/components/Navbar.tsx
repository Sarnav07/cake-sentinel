import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import LiveDot from './ui/LiveDot'
import { TABS, TAB_AGENTS } from '../data/constants'
import { theme } from '../styles/theme'

// ── Route progress bar ────────────────────────────────────────────────────────
function RouteProgressBar() {
  const location = useLocation()
  const [show, setShow] = useState(false)
  const prev = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== prev.current) {
      prev.current = location.pathname
      setShow(true)
      const t = setTimeout(() => setShow(false), 500)
      return () => clearTimeout(t)
    }
  }, [location.pathname])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="progress"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 100,
            background: 'var(--cyan)', transformOrigin: 'left center',
            boxShadow: '0 0 8px var(--cyan)',
          }}
        />
      )}
    </AnimatePresence>
  )
}

// ── Mobile bottom sheet ───────────────────────────────────────────────────────
function MobileBottomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-8"
            style={{
              background: 'rgba(8,11,18,0.97)',
              borderTop: '1px solid var(--border-accent)',
              borderRadius: '20px 20px 0 0',
              backdropFilter: 'blur(30px)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>
            {/* Tab list */}
            {TABS.map(tab => {
              const key = tab.path.replace('/', '')
              const agent = TAB_AGENTS[key]
              const isActive = location.pathname.startsWith(tab.path)
              return (
                <NavLink key={tab.path} to={tab.path} onClick={onClose}>
                  <div
                    className="flex items-center gap-4 px-6 transition-all"
                    style={{
                      height: 48,
                      background: isActive ? `${agent?.color}10` : 'transparent',
                      borderLeft: isActive ? `3px solid ${agent?.color}` : '3px solid transparent',
                    }}
                  >
                    <span style={{ color: agent?.color ?? 'var(--text-muted)', fontSize: 16 }}>
                      {agent?.icon}
                    </span>
                    <span className="text-[13px] font-semibold" style={{
                      fontFamily: 'var(--font-mono)',
                      color: isActive ? agent?.color : 'var(--text-secondary)',
                    }}>
                      {tab.label}
                    </span>
                    {agent && (
                      <span className="ml-auto text-[9px] uppercase tracking-[0.15em]"
                        style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {agent.name}
                      </span>
                    )}
                  </div>
                </NavLink>
              )
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const location = useLocation()
  const [time, setTime] = useState(new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = time.toLocaleTimeString('en-US', { hour12: false })

  // Current tab's agent
  const tabKey   = location.pathname.replace('/', '') || 'market'
  const agent    = TAB_AGENTS[tabKey] ?? null

  return (
    <>
      <RouteProgressBar />
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 h-[60px]"
        style={{
          background: 'rgba(8, 11, 18, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border-dim)',
        }}
      >
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <span
            className="text-xl font-black tracking-[0.15em] nexus-glow select-none flex-shrink-0"
            style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}
          >
            NEXUS
          </span>

          {/* Breadcrumb separator + agent name */}
          {agent && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>›</span>
              <AnimatePresence mode="wait">
                <motion.div key={tabKey}
                  initial={{ x: 12, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -12, opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="flex items-center gap-1.5"
                >
                  <span style={{ color: agent.color, fontSize: 12 }}>{agent.icon}</span>
                  {/* Full name on tablet+, icon-only on mobile */}
                  <span className="hidden sm:block text-[11px] font-semibold truncate"
                    style={{ color: agent.color, fontFamily: 'var(--font-mono)', maxWidth: 160 }}>
                    {agent.name}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Live badge — hide on smallest screens */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full flex-shrink-0"
            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)' }}>
            <LiveDot color={theme.accent.success} size="sm" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: theme.accent.success, fontFamily: 'var(--font-mono)' }}>
              LIVE • BSC TESTNET
            </span>
          </div>
        </div>

        {/* Center: Desktop tab navigation */}
        <nav className="hidden md:flex items-center">
          {TABS.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path)
            const tKey = tab.path.replace('/', '')
            const ta = TAB_AGENTS[tKey]
            return (
              <NavLink key={tab.path} to={tab.path} className="relative">
                <div
                  className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: isActive ? (ta?.color ?? 'var(--cyan)') : 'var(--text-secondary)',
                    textShadow: isActive ? `0 0 12px ${ta?.color ?? 'var(--cyan)'}80` : 'none',
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{
                        background: ta?.color ?? 'var(--cyan)',
                        boxShadow: `0 0 8px ${ta?.color ?? 'var(--cyan)'}`,
                      }}
                    />
                  )}
                </div>
              </NavLink>
            )
          })}
        </nav>

        {/* Right: Clock + hamburger */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-sm tabular-nums"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {fmt}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden flex flex-col justify-center items-center gap-1.5 w-8 h-8"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Open navigation"
          >
            <motion.span animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="w-5 h-[1.5px] rounded-full block"
              style={{ background: 'var(--text-secondary)', transformOrigin: 'center' }} />
            <motion.span animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-5 h-[1.5px] rounded-full block"
              style={{ background: 'var(--text-secondary)' }} />
            <motion.span animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="w-5 h-[1.5px] rounded-full block"
              style={{ background: 'var(--text-secondary)', transformOrigin: 'center' }} />
          </button>
        </div>
      </motion.header>

      {/* Mobile bottom sheet */}
      <MobileBottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
