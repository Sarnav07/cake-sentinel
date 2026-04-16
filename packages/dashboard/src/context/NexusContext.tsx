import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { engine, EngineState, AgentName, Signal, MarketRegime, RegimeHistoryEntry, StrategyPerf } from '../data/MockDataEngine'

// ── Context shape ─────────────────────────────────────────────────────────────
interface NexusCtx {
  state: EngineState
  // Risk Guardian ARMED state
  armed: boolean
  toggleArmed: () => void
  // Circuit breakers
  breakers: Record<string, boolean>
  toggleBreaker: (key: string) => void
  // Tab-level state
  selectedStrategy: string | null
  setSelectedStrategy: (s: string | null) => void
  activePairFilter: string
  setActivePairFilter: (p: string) => void
  activeSideFilter: string
  setActiveSideFilter: (s: string) => void
  // Agent detail sidebar
  sidebarAgent: AgentName | null
  setSidebarAgent: (a: AgentName | null) => void
  // Strategy tab shortcuts (derived from state)
  signals: Signal[]
  marketRegime: MarketRegime
  regimeHistory: RegimeHistoryEntry[]
  strategyPerformance: StrategyPerf[]
}

const Ctx = createContext<NexusCtx | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function NexusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState>(engine.state)
  const [armed, setArmed] = useState(true)
  const [breakers, setBreakers] = useState<Record<string, boolean>>({
    'maxDrawdown':    true,
    'flashCrash':     true,
    'oracleFailure':  true,
    'depegAlert':     true,
  })
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [activePairFilter, setActivePairFilter]   = useState('All Pairs')
  const [activeSideFilter, setActiveSideFilter]   = useState('All Sides')
  const [sidebarAgent, setSidebarAgent]           = useState<AgentName | null>(null)

  useEffect(() => {
    const unsub = engine.subscribe(setState)
    engine.start()
    return () => { engine.stop(); unsub() }
  }, [])

  const toggleArmed = useCallback(() => setArmed(v => !v), [])
  const toggleBreaker = useCallback((key: string) => {
    setBreakers(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <Ctx.Provider value={{
      state, armed, toggleArmed, breakers, toggleBreaker,
      selectedStrategy, setSelectedStrategy,
      activePairFilter, setActivePairFilter,
      activeSideFilter, setActiveSideFilter,
      sidebarAgent, setSidebarAgent,
      // Strategy tab shortcuts
      signals:             state.signals,
      marketRegime:        state.marketRegime,
      regimeHistory:       state.regimeHistory,
      strategyPerformance: state.strategyPerformance,
    }}>
      {children}
    </Ctx.Provider>
  )
}

// ── Consumer hook ─────────────────────────────────────────────────────────────
export function useNexus(): NexusCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNexus must be used inside <NexusProvider>')
  return ctx
}

// ── Granular hooks ────────────────────────────────────────────────────────────
export function useLivePrice(pair: string) {
  const { state } = useNexus()
  return state.prices[pair] ?? { price: 0, prev: 0, change: 0, changePercent: 0 }
}

export function useLivePnL() {
  const { state } = useNexus()
  return state.pnl
}

export function useLiquidityStream() {
  const { state } = useNexus()
  return state.liquidityStream
}

export function useExecutionFeed() {
  const { state } = useNexus()
  return state.trades
}

export function useRiskMetrics() {
  const { state } = useNexus()
  return state.risk
}

export function usePoolData() {
  const { state } = useNexus()
  return state.pools
}

export function useActivityFeed() {
  const { state } = useNexus()
  return state.activity
}

export function useAgentStatuses() {
  const { state } = useNexus()
  return state.agents
}

export function useSignals() {
  const { state } = useNexus()
  return state.signals
}

export function useMarketRegime() {
  const { state } = useNexus()
  return { regime: state.marketRegime, history: state.regimeHistory }
}

export function useStrategyPerformance() {
  const { state } = useNexus()
  return state.strategyPerformance
}
