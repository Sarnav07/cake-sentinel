import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  engine, EngineState, AgentName,
  Signal, MarketRegime, RegimeHistoryEntry, StrategyPerf,
  RiskLimits, CircuitBreakers, DrawdownPoint, PositionExposure,
  EquityPoint, TradeBucket, StrategyBreakdown,
} from '../data/MockDataEngine'

// ── Context shape ─────────────────────────────────────────────────────────────
interface NexusCtx {
  state: EngineState
  // Risk Guardian ARMED state
  armed: boolean
  toggleArmed: () => void
  // Circuit breakers (global, delegated to engine)
  circuitBreakers: CircuitBreakers
  setCircuitBreakers: (b: Partial<CircuitBreakers>) => void
  // Risk limits (slider values, delegated to engine)
  riskLimits: RiskLimits
  setRiskLimits: (l: Partial<RiskLimits>) => void
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
  // Portfolio tab shortcuts
  equityCurve: EquityPoint[]
  gasEfficiency: number
  tradeDistribution: TradeBucket[]
  strategyBreakdown: StrategyBreakdown[]
  // Liquidity tab actions
  sendToStrategy: (poolName: string) => void
}

const Ctx = createContext<NexusCtx | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function NexusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState>(engine.state)
  const [armed, setArmed] = useState(true)
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

  // Delegate setters to engine so they propagate to all subscribers
  const setRiskLimits    = useCallback((l: Partial<RiskLimits>)    => engine.setRiskLimits(l), [])
  const setCircuitBreakers = useCallback((b: Partial<CircuitBreakers>) => engine.setCircuitBreakers(b), [])

  const sendToStrategy = useCallback((poolName: string) => engine.sendToStrategy(poolName), [])

  return (
    <Ctx.Provider value={{
      state, armed, toggleArmed,
      circuitBreakers: state.circuitBreakers,
      setCircuitBreakers,
      riskLimits: state.riskLimits,
      setRiskLimits,
      selectedStrategy, setSelectedStrategy,
      activePairFilter, setActivePairFilter,
      activeSideFilter, setActiveSideFilter,
      sidebarAgent, setSidebarAgent,
      // Strategy tab shortcuts
      signals:             state.signals,
      marketRegime:        state.marketRegime,
      regimeHistory:       state.regimeHistory,
      strategyPerformance: state.strategyPerformance,
      // Portfolio tab shortcuts
      equityCurve:         state.equityCurve,
      gasEfficiency:       state.gasEfficiency,
      tradeDistribution:   state.tradeDistribution,
      strategyBreakdown:   state.strategyBreakdown,
      // Liquidity tab actions
      sendToStrategy,
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

export function useDrawdownHistory() {
  const { state } = useNexus()
  return state.drawdownHistory
}

export function useRiskLimits() {
  const { nexusCtx } = { nexusCtx: useNexus() }
  return { riskLimits: nexusCtx.riskLimits, setRiskLimits: nexusCtx.setRiskLimits }
}

export function useCircuitBreakers() {
  const ctx = useNexus()
  return { circuitBreakers: ctx.circuitBreakers, setCircuitBreakers: ctx.setCircuitBreakers }
}

export function usePositionExposure() {
  const { state } = useNexus()
  return state.positionExposure
}

// Portfolio tab hooks
export function useEquityCurve() {
  const { state } = useNexus()
  return state.equityCurve
}

export function useTradeDist() {
  const { state } = useNexus()
  return state.tradeDistribution
}

export function useStrategyBreakdown() {
  const { state } = useNexus()
  return state.strategyBreakdown
}

export function useGasEfficiency() {
  const { state } = useNexus()
  return state.gasEfficiency
}

// Re-export types for page files
export type { EquityPoint, TradeBucket, StrategyBreakdown }
