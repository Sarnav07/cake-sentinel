import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  engine, EngineState, AgentName,
  Signal, MarketRegime, RegimeHistoryEntry, StrategyPerf,
  RiskLimits, CircuitBreakers, DrawdownPoint, PositionExposure,
  EquityPoint, TradeBucket, StrategyBreakdown, BreachAlert,
} from '../data/MockDataEngine'
import * as agentOrchestrator from '../agents/AgentOrchestrator'

// ── Context shape ─────────────────────────────────────────────────────────────
interface NexusCtx {
  state: EngineState
  // Risk Guardian ARMED state
  armed: boolean
  toggleArmed: () => void
  clearBreach: () => void
  breachAlert: BreachAlert | null
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
  // Boot state
  isInitializing: boolean
  // Demo integration
  demo: {
    runDemoSequence: (onStep: (n: number, msg: string) => void) => Promise<void>
    setAutoExecute: (val: boolean) => void
    setSignalFrequency: (val: number) => void
    forceTrade: () => void
    triggerBreach: () => void
    resetAll: () => void
    rearm: () => void
    executeSignal: (s: any) => Promise<any>
  }
  realBNBPrice: number | null
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
  const [isInitializing, setIsInitializing]       = useState(true)
  const [realBNBPrice, setRealBNBPrice]           = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setIsInitializing(false), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // We run the orchestrator when the provider heavily mounts.
    const unsub = engine.subscribe(setState)
    engine.start()

    // Setup orchestrator to patch state directly
    agentOrchestrator.startOrchestrator((action: string, payload: any) => {
      // Handle patch actions 
      if (action === 'patchPrice') {
        engine.patchPrice(payload.pair, payload.price)
        if (payload.pair === 'BNB/USDC') setRealBNBPrice(payload.price)
      } else if (action === 'signals') {
        engine.patchSignals(payload)
      } else if (action === 'trade') {
        engine.patchTrade(payload)
      } else if (action === 'breach') {
        engine.patchBreach(payload)
      } else if (action === 'resetAll') {
        engine.resetAll()
      } else if (action === 'log') {
        engine.patchActivity(payload)
      } else if (action === 'agentState') {
        engine.patchAgentState(payload)
      } else if (action === 'regime') {
        engine.patchRegime(payload)
      }
    })

    return () => { 
      engine.stop()
      unsub() 
      agentOrchestrator.stopOrchestrator()
    }
  }, [])

  const toggleArmed = useCallback(() => setArmed(v => !v), [])

  // Sync armed state into the engine so _generateTrade() respects it
  useEffect(() => { engine.setArmedState(armed) }, [armed])

  // Auto-disarm when engine raises a DRAWDOWN breachAlert
  useEffect(() => {
    if (state.breachAlert?.type === 'DRAWDOWN') setArmed(false)
  }, [state.breachAlert])

  const clearBreach = useCallback(() => {
    engine.clearBreachAlert()
    setArmed(true)
  }, [])

  // Delegate setters to engine so they propagate to all subscribers
  const setRiskLimits    = useCallback((l: Partial<RiskLimits>)    => engine.setRiskLimits(l), [])
  const setCircuitBreakers = useCallback((b: Partial<CircuitBreakers>) => engine.setCircuitBreakers(b), [])

  const sendToStrategy = useCallback((poolName: string) => engine.sendToStrategy(poolName), [])

  return (
    <Ctx.Provider value={{
      state, armed, toggleArmed, clearBreach,
      breachAlert: state.breachAlert,
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
      // Boot
      isInitializing,
      demo: {
        runDemoSequence: agentOrchestrator.runDemoSequence,
        setAutoExecute: agentOrchestrator.setAutoExecute,
        setSignalFrequency: agentOrchestrator.setSignalFrequency,
        forceTrade: agentOrchestrator.forceTrade,
        triggerBreach: agentOrchestrator.triggerBreachManual,
        resetAll: agentOrchestrator.resetAll,
        rearm: agentOrchestrator.rearm,
        executeSignal: agentOrchestrator.executeSignal,
      },
      realBNBPrice,
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

export function useIsInitializing() {
  return useNexus().isInitializing
}

// Re-export types for page files
export type { EquityPoint, TradeBucket, StrategyBreakdown, BreachAlert }

export function useBreachAlert() {
  const { breachAlert, clearBreach } = useNexus()
  return { breachAlert, clearBreach }
}
