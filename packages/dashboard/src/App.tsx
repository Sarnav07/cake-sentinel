import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { NexusProvider } from './context/NexusContext'
import { useNexus, useBreachAlert } from './context/NexusContext'
import { theme } from './styles/theme'
import Navbar           from './components/Navbar'
import AgentStatusBar   from './components/shared/AgentStatusBar'
import LandingPage      from './pages/LandingPage'
import MarketPage       from './pages/MarketPage'
import StrategyPage     from './pages/StrategyPage'
import ExecutionPage    from './pages/ExecutionPage'
import RiskPage         from './pages/RiskPage'
import PortfolioPage    from './pages/PortfolioPage'
import LiquidityPage    from './pages/LiquidityPage'
import DemoController   from './components/shared/DemoController'

// ── Firewall Banner ────────────────────────────────────────────────────────────
// Slides down from the top of every dashboard tab when isArmed = false
function FirewallBanner() {
  const { armed, clearBreach } = useNexus()
  const { breachAlert }        = useBreachAlert()

  return (
    <AnimatePresence>
      {!armed && (
        <motion.div
          key="firewall-banner"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="flex items-center justify-between px-6 py-2.5 z-30 relative"
          style={{
            background: theme.breach.bg,
            borderBottom: `1px solid ${theme.border.breach}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-sm">⚠</motion.span>
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white"
              style={{ fontFamily: 'var(--font-mono)' }}>
              Risk Firewall Triggered — Trading Paused
            </span>
            {breachAlert && (
              <span className="text-[9px] px-2 py-0.5 rounded"
                style={{ background: theme.bg.elevated15, color: theme.text.white,
                  fontFamily: 'var(--font-mono)' }}>
                {breachAlert.type}: {breachAlert.value}{breachAlert.type === 'DRAWDOWN' ? '%' : ''} {'>'} {breachAlert.limit * 0.9}{breachAlert.type === 'DRAWDOWN' ? '%' : ''} limit
              </span>
            )}
          </div>
          <motion.button
            onClick={clearBreach}
            whileHover={{ background: 'rgba(255,255,255,0.25)', scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] text-white flex-shrink-0"
            style={{ border: `1px solid ${theme.border.white40}`, fontFamily: 'var(--font-mono)',
              background: theme.border.subtle }}>
            ↺ Reset & Rearm
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Page transition wrapper ───────────────────────────────────────────────────
function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ── Inner router (needs useLocation inside BrowserRouter) ─────────────────────
function AppRoutes() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <>
      {/* Scanline overlay */}
      <div className="scanlines pointer-events-none" />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.accent.orbCyan} 0%, transparent 70%)`, filter: 'blur(70px)', opacity: 0.7 }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.accent.orbPurple} 0%, transparent 70%)`, filter: 'blur(80px)', opacity: 0.5 }} />
        <div className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full"
          style={{ background: `radial-gradient(circle, ${theme.accent.orbMagenta} 0%, transparent 70%)`, filter: 'blur(60px)', opacity: 0.4 }} />
      </div>

      {/* Navbar + agent bar + firewall banner — only shown on dashboard routes */}
      {!isLanding && (
        <>
          <Navbar />
          <div className="pt-[60px]">
            <AgentStatusBar />
            <FirewallBanner />
          </div>
        </>
      )}

      {/* Routes with AnimatePresence for transitions */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Landing */}
          <Route path="/"          element={<PageWrapper><LandingPage /></PageWrapper>} />

          {/* Dashboard tabs — all wrapped in content padding */}
          <Route path="/market"    element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><MarketPage /></PageWrapper>
            </div>
          } />
          <Route path="/strategy"  element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><StrategyPage /></PageWrapper>
            </div>
          } />
          <Route path="/execution" element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><ExecutionPage /></PageWrapper>
            </div>
          } />
          <Route path="/risk"      element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><RiskPage /></PageWrapper>
            </div>
          } />
          <Route path="/portfolio" element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><PortfolioPage /></PageWrapper>
            </div>
          } />
          <Route path="/liquidity" element={
            <div className="max-w-[1400px] mx-auto px-6 py-6">
              <PageWrapper><LiquidityPage /></PageWrapper>
            </div>
          } />
        </Routes>
      </AnimatePresence>
    </>
  )
}

// ── App root ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NexusProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <DemoController />
    </NexusProvider>
  )
}
