// MockDataEngine.ts — Random-walk price simulation + live metric emission

// ── Gaussian random (Box-Muller) ──────────────────────────────────────────────
function randomNormal(mean = 0, std = 1): number {
  const u1 = Math.random(), u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PriceState {
  price: number; prev: number; change: number; changePercent: number
}

export interface Trade {
  id: string; time: string; pair: string; side: 'BUY' | 'SELL'
  size: string; entry: number; exit: number; gas: number; pnl: number; status: 'CONFIRMED' | 'FAILED'
  simulated?: boolean
}

export interface Pool {
  name: string; version: 'V2' | 'V3'; tier: 'BLUE-CHIP' | 'MID-CAP' | 'DEGEN'
  fee: string; tvl: number; vol24h: number; aprRaw: number; apr: string; arb: boolean
  reserveImbalance: number  // 0–20%
}

export interface Signal {
  id: string
  pair: string
  strategy: 'ARBITRAGE' | 'TREND' | 'MEAN-REVERSION'
  expectedProfit: number
  confidence: number
  riskScore: number
  entryPrice: number
  exitPrice: number
  timestamp: string
}

export type RegimeLabel = 'TRENDING' | 'MEAN-REVERTING' | 'HIGH-VOLATILITY' | 'CHOPPY'

export interface MarketRegime {
  current: RegimeLabel
  confidence: number
  updatedAt: string
}

export interface RegimeHistoryEntry {
  regime: RegimeLabel
  timestamp: string
  duration: string
}

export interface StrategyPerf {
  name: string
  trades: number
  winPct: string
  avgProfit: string
  total: string
  status: 'ACTIVE' | 'PAUSED'
}

export interface EquityPoint {
  time: string; totalPnL: number; benchmark: number
}

export interface TradeBucket {
  bucket: string; count: number; profit: boolean | null
}

export interface StrategyBreakdown {
  name: string; trades: number; winPct: string
  grossPnL: number; gasCost: number; netPnL: number; sharpe: number
}

export interface DrawdownPoint { time: string; value: number }

export interface RiskLimits {
  drawdownLimit: number   // 0–15%
  positionSize:  number   // 0–500 USD
  anomalyScore:  number   // 0–100
}

export interface CircuitBreakers {
  maxDrawdown: boolean
  flashCrash:  boolean
  oracleGuard: boolean
  depegAlert:  boolean
}

export interface BreachAlert {
  type:      'DRAWDOWN' | 'ANOMALY'
  value:     number
  limit:     number
  timestamp: string
}

export interface PositionExposure {
  token:        string
  exposure:     string
  portfolioPct: string
  riskLevel:    'LOW' | 'MEDIUM' | 'HIGH'
}

export type ActivityEntry = {
  id: string; ts: string; agent: AgentName; message: string; value?: string
}

export type AgentName = 'Market Intel' | 'Strategy' | 'Execution' | 'Risk' | 'Portfolio' | 'Liquidity' | 'Simulation'

export type AgentStatus = { name: AgentName; active: boolean; color: string }

export interface EngineState {
  prices: Record<string, PriceState>
  pnl: { total: number; today: number; winRate: number; activeCount: number; winCount: number; tradeCount: number }
  liquidityStream: number[]
  trades: Trade[]
  risk: { drawdown: number; anomaly: number; sharpe: number; positionSize: number }
  pools: Pool[]
  activity: ActivityEntry[]
  agents: AgentStatus[]
  // Strategy tab state
  signals: Signal[]
  marketRegime: MarketRegime
  regimeHistory: RegimeHistoryEntry[]
  strategyPerformance: StrategyPerf[]
  // Risk tab state
  drawdownHistory: DrawdownPoint[]
  riskLimits: RiskLimits
  circuitBreakers: CircuitBreakers
  breachAlert: BreachAlert | null
  positionExposure: PositionExposure[]
  // Portfolio tab state
  equityCurve: EquityPoint[]
  gasEfficiency: number
  tradeDistribution: TradeBucket[]
  strategyBreakdown: StrategyBreakdown[]
}

// ── Listeners ─────────────────────────────────────────────────────────────────
type Listener = (state: EngineState) => void

// ── Constants ─────────────────────────────────────────────────────────────────
const PAIRS = ['BNB/USDC', 'CAKE/BNB', 'ETH/USDC', 'BTCB/USDT', 'XRP/USDT']
const AGENT_COLORS: Record<AgentName, string> = {
  'Market Intel': '#00e5ff',
  'Strategy':     '#a855f7',
  'Execution':    '#f59e0b',
  'Risk':         '#ff4444',
  'Portfolio':    '#00ff88',
  'Liquidity':    '#38bdf8',
  'Simulation':   '#f472b6',
}

const REGIME_SEQUENCE: RegimeLabel[] = ['TRENDING', 'MEAN-REVERTING', 'HIGH-VOLATILITY', 'CHOPPY']
const STRATEGY_TEMPLATES: Signal[] = [
  { id: 's1', pair: 'BNB/USDC',  strategy: 'ARBITRAGE',     expectedProfit: 3.89, confidence: 87, riskScore: 2, entryPrice: 312.40, exitPrice: 315.20, timestamp: '' },
  { id: 's2', pair: 'CAKE/BNB',  strategy: 'TREND',          expectedProfit: 2.15, confidence: 74, riskScore: 3, entryPrice: 2.841,  exitPrice: 2.910,  timestamp: '' },
  { id: 's3', pair: 'ETH/USDC',  strategy: 'MEAN-REVERSION', expectedProfit: 5.60, confidence: 68, riskScore: 2, entryPrice: 1847.2, exitPrice: 1856.8, timestamp: '' },
  { id: 's4', pair: 'BNB/BUSD',  strategy: 'ARBITRAGE',     expectedProfit: 1.20, confidence: 61, riskScore: 1, entryPrice: 311.90, exitPrice: 313.10, timestamp: '' },
  { id: 's5', pair: 'BTCB/USDT', strategy: 'TREND',          expectedProfit: 9.88, confidence: 55, riskScore: 4, entryPrice: 43201,  exitPrice: 43450,  timestamp: '' },
  { id: 's6', pair: 'XRP/USDT',  strategy: 'MEAN-REVERSION', expectedProfit: 0.74, confidence: 49, riskScore: 3, entryPrice: 0.521,  exitPrice: 0.528,  timestamp: '' },
]

const INIT_STRATEGY_PERF: StrategyPerf[] = [
  { name: 'Arbitrage Scanner', trades: 142, winPct: '71.8%', avgProfit: '+$1.24', total: '+$176.08', status: 'ACTIVE'  },
  { name: 'Trend Follower',    trades:  58, winPct: '65.5%', avgProfit: '+$3.41', total: '+$197.78', status: 'ACTIVE'  },
  { name: 'Mean Reversion',    trades:  34, winPct: '58.8%', avgProfit: '+$0.97', total: '+$32.98',  status: 'PAUSED'  },
  { name: 'Momentum Engine',   trades:   0, winPct: '—',     avgProfit: '—',      total: '$0.00',    status: 'PAUSED'  },
]

const POOL_INIT: Pool[] = [
  { name: 'BNB/BUSD',  version: 'V3', tier: 'BLUE-CHIP', fee: '0.05%', tvl: 1.08e12, vol24h: 1.24e6,  aprRaw: 14.1,  apr: '14.1%',  arb: false, reserveImbalance: 0.4 },
  { name: 'CAKE/BNB',  version: 'V3', tier: 'MID-CAP',   fee: '0.25%', tvl: 2.40e12, vol24h: 320e3,   aprRaw: 47.2,  apr: '47.2%',  arb: true,  reserveImbalance: 2.1 },
  { name: 'ETH/USDC',  version: 'V3', tier: 'BLUE-CHIP', fee: '0.05%', tvl: 720e6,   vol24h: 78e3,    aprRaw: 12.2,  apr: '12.2%',  arb: false, reserveImbalance: 0.7 },
  { name: 'BTCB/USDT', version: 'V2', tier: 'BLUE-CHIP', fee: '0.25%', tvl: 441e6,   vol24h: 48e3,    aprRaw: 9.8,   apr: '9.8%',   arb: false, reserveImbalance: 0.2 },
  { name: 'XRP/USDT',  version: 'V2', tier: 'MID-CAP',   fee: '0.25%', tvl: 128e6,   vol24h: 22e3,    aprRaw: 31.4,  apr: '31.4%',  arb: false, reserveImbalance: 1.3 },
  { name: 'SHIB/BUSD', version: 'V2', tier: 'DEGEN',     fee: '1.00%', tvl: 18e6,    vol24h: 4200,    aprRaw: 124.7, apr: '124.7%', arb: false, reserveImbalance: 8.4 },
]

const INIT_BREAKDOWN: StrategyBreakdown[] = [
  { name: 'Cross-pool Arb',  trades: 142, winPct: '71.8%', grossPnL: 198.41, gasCost: 22.33, netPnL: 176.08, sharpe: 2.41 },
  { name: 'Trend Following', trades:  58, winPct: '65.5%', grossPnL: 221.11, gasCost: 23.33, netPnL: 197.78, sharpe: 1.87 },
  { name: 'Mean Reversion',  trades:  34, winPct: '58.8%', grossPnL:  41.91, gasCost:  8.93, netPnL:  32.98, sharpe: 1.12 },
  { name: 'LP Provision',    trades:  12, winPct: '91.7%', grossPnL:  53.24, gasCost:  7.56, netPnL:  45.68, sharpe: 3.02 },
]

const INIT_DISTRIBUTION = (): TradeBucket[] => [
  { bucket: '-$5+', count:  4, profit: false },
  { bucket: '-$3',  count:  7, profit: false },
  { bucket: '-$1',  count: 11, profit: false },
  { bucket: '+$0',  count:  5, profit: null  },
  { bucket: '+$1',  count: 18, profit: true  },
  { bucket: '+$3',  count: 22, profit: true  },
  { bucket: '+$5+', count: 13, profit: true  },
]

const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false })

// ── Engine ────────────────────────────────────────────────────────────────────
export class MockDataEngine {
  private listeners = new Set<Listener>()
  private timers: ReturnType<typeof setInterval>[] = []
  private _armed = true  // mirrors NexusContext armed state
  private _regimeIdx = 0
  // track cumulative drawdown for history
  private _cumulativeDD = 0
  // track previous pool APRs for flash detection
  private _prevPoolAprs: Record<string, number> = {}
  state: EngineState

  constructor() {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false })
    // seed 30-point drawdown history
    const ddHistory: DrawdownPoint[] = Array.from({ length: 30 }, (_, i) => ({
      time: now,
      value: -(Math.abs(Math.sin(i / 6)) * 5 + Math.random() * 1.2),
    }))
    // seed 200-point equity curve (historical shape)
    let runningPnL = 0
    const equityCurve: EquityPoint[] = Array.from({ length: 200 }, (_, i) => {
      const delta = randomNormal(0.6, 3.5)
      runningPnL = Math.max(0, runningPnL + delta)
      return { time: now, totalPnL: parseFloat(runningPnL.toFixed(2)), benchmark: parseFloat((runningPnL * 0.72).toFixed(2)) }
    })
    // seed init pool APRs for flash comparison
    POOL_INIT.forEach(p => { this._prevPoolAprs[p.name] = p.aprRaw })
    const pools = POOL_INIT.map(p => ({ ...p }))
    this.state = {
      prices: {
        'BNB/USDC':  this._initPrice(312.40),
        'CAKE/BNB':  this._initPrice(2.841),
        'ETH/USDC':  this._initPrice(1847.20),
        'BTCB/USDT': this._initPrice(43201),
        'XRP/USDT':  this._initPrice(0.521),
      },
      pnl: { total: 1452.50, today: 48.20, winRate: 68.4, activeCount: 3, winCount: 168, tradeCount: 246 },
      liquidityStream: Array.from({ length: 30 }, (_, i) => 250 + Math.sin(i / 5) * 10 + Math.random() * 5),
      trades: this._initTrades(),
      risk: { drawdown: 4.8, anomaly: 22, sharpe: 2.41, positionSize: 320 },
      pools,
      activity: [],
      agents: (Object.entries(AGENT_COLORS) as [AgentName, string][]).map(([name, color]) => ({ name, active: false, color })),
      signals: STRATEGY_TEMPLATES.map(s => ({ ...s, timestamp: now })),
      marketRegime: { current: 'TRENDING', confidence: 82, updatedAt: now },
      regimeHistory: [
        { regime: 'TRENDING',       timestamp: now, duration: '12m' },
        { regime: 'HIGH-VOLATILITY',timestamp: now, duration: '5m'  },
        { regime: 'MEAN-REVERTING', timestamp: now, duration: '18m' },
        { regime: 'CHOPPY',         timestamp: now, duration: '9m'  },
        { regime: 'TRENDING',       timestamp: now, duration: '22m' },
      ],
      strategyPerformance: INIT_STRATEGY_PERF,
      // Risk tab
      drawdownHistory: ddHistory,
      riskLimits: { drawdownLimit: 15, positionSize: 320, anomalyScore: 70 },
      circuitBreakers: { maxDrawdown: true, flashCrash: true, oracleGuard: true, depegAlert: true },
      breachAlert: null,
      positionExposure: [
        { token: 'WBNB', exposure: '$845.20', portfolioPct: '58.3%', riskLevel: 'LOW'    },
        { token: 'USDT', exposure: '$412.00', portfolioPct: '28.4%', riskLevel: 'LOW'    },
        { token: 'CAKE', exposure: '$193.40', portfolioPct: '13.3%', riskLevel: 'MEDIUM' },
      ],
      // Portfolio tab
      equityCurve,
      gasEfficiency: 89.2,
      tradeDistribution: INIT_DISTRIBUTION(),
      strategyBreakdown: INIT_BREAKDOWN,
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state) // immediate first emit
    return () => this.listeners.delete(fn)
  }

  /** Called by NexusContext whenever armed state changes */
  setArmedState(armed: boolean) {
    this._armed = armed
  }

  /** Called by NexusContext RESET & REARM action */
  clearBreachAlert() {
    this._armed = true
    this.state = { ...this.state, breachAlert: null }
    this._emit()
  }


  start() {
    // Price tick: every 2s
    this.timers.push(setInterval(() => this._tickPrices(), 2000))
    // New trade: every 5s
    this.timers.push(setInterval(() => this._generateTrade(), 5000))
    // Risk drift: every 7s
    this.timers.push(setInterval(() => this._tickRisk(), 7000))
    // Pool vol / arb: every 8s
    this.timers.push(setInterval(() => this._tickPools(), 8000))
    // Activity messages: every 3s
    this.timers.push(setInterval(() => this._generateActivity(), 3000))
    // Agent flash: every 2s
    this.timers.push(setInterval(() => this._tickAgents(), 2000))
    // Signal refresh: every 8s
    this.timers.push(setInterval(() => this._tickSignals(), 8000))
    // Regime rotation: every 45s
    this.timers.push(setInterval(() => this._tickRegime(), 45000))
    // Drawdown history: every 5s
    this.timers.push(setInterval(() => this._tickDrawdown(), 5000))
    // Flash crash trip: every 120s
    this.timers.push(setInterval(() => this._tripFlashCrash(), 120000))
    // Equity curve: every 4s
    this.timers.push(setInterval(() => this._tickEquity(), 4000))
  }

  stop() {
    this.timers.forEach(t => clearInterval(t))
    this.timers = []
  }

  // ── Private Helpers ────────────────────────────────────────────────────────
  private _initPrice(p: number): PriceState {
    return { price: p, prev: p, change: 0, changePercent: 0 }
  }

  private _initTrades(): Trade[] {
    const pairs  = PAIRS
    const sides  = ['BUY', 'SELL'] as const
    return Array.from({ length: 20 }, (_, i) => {
      const pair  = pairs[i % pairs.length]
      const side  = sides[i % 2]
      const entry = 300 + Math.random() * 50
      const pnl   = parseFloat((Math.random() * 12 - 3).toFixed(2))
      const h     = String(i % 24).padStart(2, '0')
      const m     = String((i * 7) % 60).padStart(2, '0')
      const s     = String((i * 13) % 60).padStart(2, '0')
      return {
        id: `T${String(i).padStart(4, '0')}`,
        time: `${h}:${m}:${s}`, pair, side,
        size: `${(0.1 + Math.random()).toFixed(3)} ${pair.split('/')[0]}`,
        entry, exit: entry + pnl * 0.8,
        gas: parseFloat((0.001 + Math.random() * 0.005).toFixed(4)),
        pnl, status: Math.random() > 0.1 ? 'CONFIRMED' : 'FAILED',
        simulated: false,
      }
    })
  }

  private _emit() {
    const snap = { ...this.state, agents: [...this.state.agents] }
    this.listeners.forEach(fn => fn(snap))
  }

  private _tickPrices() {
    const updated = { ...this.state.prices }
    for (const pair of PAIRS) {
      const prev = updated[pair].price
      const next = parseFloat((prev * (1 + randomNormal(0, 0.001))).toFixed(4))
      updated[pair] = {
        prev, price: next,
        change: parseFloat((next - prev).toFixed(4)),
        changePercent: parseFloat((((next - prev) / prev) * 100).toFixed(3)),
      }
    }
    // Rolling liquidity stream window (shift left, push new BNB price)
    const stream = [...this.state.liquidityStream.slice(1), updated['BNB/USDC'].price]
    this.state = { ...this.state, prices: updated, liquidityStream: stream }
    this._emit()
  }

  private _generateTrade() {
    // Pause trade generation when system is disarmed
    if (!this._armed) return

    const pairs  = PAIRS
    const sides  = ['BUY', 'SELL'] as const
    const pair   = pairs[Math.floor(Math.random() * pairs.length)]
    const side   = sides[Math.floor(Math.random() * 2)]
    const entry  = this.state.prices[pair]?.price ?? 300
    const pnl    = parseFloat((randomNormal(1.5, 4)).toFixed(2))
    const isWin  = pnl > 0

    const trade: Trade = {
      id: `T${Date.now()}`, time: nowStr(), pair, side,
      size: `${(0.1 + Math.random()).toFixed(3)} ${pair.split('/')[0]}`,
      entry, exit: entry + pnl * 0.8,
      gas: parseFloat((0.001 + Math.random() * 0.005).toFixed(4)),
      pnl, status: Math.random() > 0.05 ? 'CONFIRMED' : 'FAILED',
      simulated: false,
    }

    const s = this.state.pnl
    const newTradeCount = s.tradeCount + 1
    const newWinCount   = isWin ? s.winCount + 1 : s.winCount

    // Update position exposure
    const baseToken = pair.split('/')[0]
    const exposure  = this.state.positionExposure.map(e => {
      if (e.token === baseToken || e.token === 'W' + baseToken) {
        const delta  = Math.abs(pnl) * 0.3
        const raw    = parseFloat(e.exposure.replace('$','')) + (isWin ? delta : -delta)
        return { ...e, exposure: `$${Math.max(50, raw).toFixed(2)}` }
      }
      return e
    })

    // Update trade distribution bucket
    const bucket = pnl < -5 ? '-$5+' : pnl < -3 ? '-$3' : pnl < -1 ? '-$1'
      : pnl < 0 ? '+$0' : pnl < 1 ? '+$1' : pnl < 3 ? '+$3' : '+$5+'
    const tradeDistribution = this.state.tradeDistribution.map(b =>
      b.bucket === bucket ? { ...b, count: b.count + 1 } : b
    )

    // Update strategy breakdown — rotate through strategies
    const stratNames = ['Cross-pool Arb','Trend Following','Mean Reversion','LP Provision']
    const stratName  = stratNames[Math.floor(Math.random() * stratNames.length)]
    const strategyBreakdown = this.state.strategyBreakdown.map(row => {
      if (row.name !== stratName) return row
      const newGross = row.grossPnL + (pnl > 0 ? pnl : 0)
      const newGas   = row.gasCost  + trade.gas
      const newNet   = newGross - newGas
      const newTrades = row.trades + 1
      return {
        ...row,
        trades:   newTrades,
        grossPnL: parseFloat(newGross.toFixed(2)),
        gasCost:  parseFloat(newGas.toFixed(4)),
        netPnL:   parseFloat(newNet.toFixed(2)),
      }
    })

    this.state = {
      ...this.state,
      trades: [trade, ...this.state.trades].slice(0, 50),
      pnl: {
        total:       parseFloat((s.total + pnl).toFixed(2)),
        today:       parseFloat((s.today + pnl).toFixed(2)),
        winRate:     parseFloat(((newWinCount / newTradeCount) * 100).toFixed(1)),
        activeCount: Math.max(1, s.activeCount + (Math.random() > 0.5 ? 1 : -1)),
        winCount:    newWinCount,
        tradeCount:  newTradeCount,
      },
      positionExposure: exposure,
      tradeDistribution,
      strategyBreakdown,
    }
    this._activateAgent('Execution')
    this._emit()
  }

  private _tickRisk() {
    const r = this.state.risk
    const newAnomaly = Math.max(0, Math.min(100, r.anomaly + randomNormal(0, 1.5)))
    const newRisk = {
      drawdown:     Math.max(0, Math.min(15, r.drawdown + randomNormal(0, 0.1))),
      anomaly:      newAnomaly,
      sharpe:       Math.max(0, r.sharpe + randomNormal(0, 0.02)),
      positionSize: Math.max(0, Math.min(500, r.positionSize + randomNormal(0, 5))),
    }
    const breakers = { ...this.state.circuitBreakers }

    // ── BREACH DETECTION ──────────────────────────────────────────────────────
    // Don't stack breaches — only trip if no active alert
    if (!this.state.breachAlert) {
      const ddLimit = this.state.riskLimits.drawdownLimit
      const anLimit = this.state.riskLimits.anomalyScore

      if (newRisk.drawdown >= ddLimit * 0.9) {
        // Drawdown breach → auto-disarm + circuit breaker
        this._armed = false
        breakers.maxDrawdown = false
        const alert: BreachAlert = {
          type: 'DRAWDOWN', value: parseFloat(newRisk.drawdown.toFixed(2)),
          limit: ddLimit, timestamp: nowStr(),
        }
        this.state = { ...this.state, risk: newRisk, circuitBreakers: breakers, breachAlert: alert }
        this._activateAgent('Risk')
        this._emit()
        // Auto-clear alert after 8 seconds
        setTimeout(() => {
          this.state = { ...this.state, breachAlert: null }
          this._emit()
        }, 8000)
        return
      }

      if (newAnomaly >= anLimit) {
        // Anomaly breach → warning alert (no auto-disarm, just flash)
        const alert: BreachAlert = {
          type: 'ANOMALY', value: parseFloat(newAnomaly.toFixed(0)),
          limit: anLimit, timestamp: nowStr(),
        }
        this.state = { ...this.state, risk: newRisk, circuitBreakers: breakers, breachAlert: alert }
        this._activateAgent('Risk')
        this._emit()
        setTimeout(() => {
          this.state = { ...this.state, breachAlert: null }
          this._emit()
        }, 8000)
        return
      }
    }

    this.state = { ...this.state, risk: newRisk, circuitBreakers: breakers }
    this._activateAgent('Risk')
    this._emit()
  }

  private _tickPools() {
    const pools = this.state.pools.map(p => {
      const shouldTriggerArb = Math.random() < 0.15 && !p.arb
      const newVol = p.vol24h * (1 + randomNormal(0, 0.025))
      const newApr = parseFloat((p.aprRaw * (1 + randomNormal(0, 0.008))).toFixed(1))
      const newImbalance = Math.max(0, Math.min(20, p.reserveImbalance + randomNormal(0, 0.1)))
      if (shouldTriggerArb) {
        this._activateAgent('Market Intel')
        // auto-reset arb after 10s
        setTimeout(() => {
          this.state = {
            ...this.state,
            pools: this.state.pools.map(pp => pp.name === p.name ? { ...pp, arb: false } : pp),
          }
          this._emit()
        }, 10000)
      }
      return {
        ...p,
        vol24h:           Math.max(1000, newVol),
        aprRaw:           Math.max(1, newApr),
        apr:              `${Math.max(1, newApr).toFixed(1)}%`,
        arb:              shouldTriggerArb ? true : p.arb,
        reserveImbalance: parseFloat(newImbalance.toFixed(2)),
      }
    })
    // store previous APRs for flash detection in UI
    const newPrevAprs: Record<string, number> = {}
    this.state.pools.forEach(p => { newPrevAprs[p.name] = p.aprRaw })
    this._prevPoolAprs = newPrevAprs
    this.state = { ...this.state, pools }
    this._emit()
  }

  private _generateActivity() {
    const templates: Array<{ agent: AgentName; gen: () => { msg: string; val?: string } }> = [
      { agent: 'Market Intel', gen: () => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; const v = (Math.random() * 5).toFixed(2); return { msg: `${p} spread +$${v} detected`, val: `+$${v}` } } },
      { agent: 'Market Intel', gen: () => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; return { msg: `${p} volume spike (+${(Math.random()*20+5).toFixed(1)}%)` } } },
      { agent: 'Strategy',     gen: () => { const c = (60 + Math.random() * 38).toFixed(0); return { msg: `Signal scored, confidence ${c}%`, val: `${c}%` } } },
      { agent: 'Strategy',     gen: () => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; return { msg: `${p} TREND signal queued` } } },
      { agent: 'Execution',    gen: () => { const b = (42891000 + Math.floor(Math.random() * 9999)).toLocaleString(); return { msg: `Tx confirmed block ${b}` } } },
      { agent: 'Execution',    gen: () => { const p = PAIRS[Math.floor(Math.random() * PAIRS.length)]; const pnl = (Math.random()*10-2).toFixed(2); return { msg: `${p} trade closed`, val: `${parseFloat(pnl) >= 0 ? '+' : ''}$${pnl}` } } },
      { agent: 'Risk',         gen: () => { const dd = this.state.risk.drawdown.toFixed(1); return { msg: `Drawdown ${dd}% — within limits`, val: `${dd}%` } } },
      { agent: 'Risk',         gen: () => { const a = this.state.risk.anomaly.toFixed(0); return { msg: `Anomaly score ${a} — monitoring` } } },
      { agent: 'Portfolio',    gen: () => { const t = this.state.pnl.total.toFixed(2); return { msg: `Equity curve updated`, val: `$${t}` } } },
      { agent: 'Liquidity',    gen: () => { const p = POOL_INIT[Math.floor(Math.random() * POOL_INIT.length)]; return { msg: `${p.name} APR rebalanced` } } },
      { agent: 'Simulation',   gen: () => { const v = (Math.random() * 10).toFixed(2); return { msg: `Backtest iteration complete`, val: `+$${v} expected` } } },
    ]
    const t = templates[Math.floor(Math.random() * templates.length)]
    const { msg, val } = t.gen()
    const entry: ActivityEntry = { id: `ACT-${Date.now()}`, ts: nowStr(), agent: t.agent, message: msg, value: val }
    this.state = { ...this.state, activity: [entry, ...this.state.activity].slice(0, 50) }
    this._activateAgent(t.agent)
    this._emit()
  }

  private _activateAgent(name: AgentName) {
    this.state = {
      ...this.state,
      agents: this.state.agents.map(a => a.name === name ? { ...a, active: true } : a),
    }
    setTimeout(() => {
      this.state = {
        ...this.state,
        agents: this.state.agents.map(a => a.name === name ? { ...a, active: false } : a),
      }
      this._emit()
    }, 2000)
  }

  private _tickAgents() {
    // Randomly poke a random agent to show life
    if (Math.random() < 0.4) {
      const names = Object.keys(AGENT_COLORS) as AgentName[]
      this._activateAgent(names[Math.floor(Math.random() * names.length)])
      this._emit()
    }
  }

  private _tickSignals() {
    const now = nowStr()
    const signals: Signal[] = STRATEGY_TEMPLATES.map(s => ({
      ...s,
      // shuffle expectedProfit ±$0.50
      expectedProfit: parseFloat((s.expectedProfit + (Math.random() - 0.5)).toFixed(2)),
      // drift confidence ±3
      confidence: Math.max(30, Math.min(99, s.confidence + Math.round((Math.random() - 0.5) * 6))),
      // update live entry price from engine
      entryPrice: this.state.prices[s.pair]?.price ?? s.entryPrice,
      timestamp: now,
    }))
    // keep sorted by confidence desc
    signals.sort((a, b) => b.confidence - a.confidence)

    // update strategy perf trade count on winner
    const perf = this.state.strategyPerformance.map(p => p.status === 'ACTIVE'
      ? { ...p, trades: p.trades + Math.round(Math.random()) }
      : p
    )

    this.state = { ...this.state, signals, strategyPerformance: perf }
    this._activateAgent('Strategy')
    this._emit()
  }

  private _tickDrawdown() {
    const r = this.state.risk
    // cumulative drawdown drifts based on recent trade pnl direction
    const lastPnl = this.state.trades[0]?.pnl ?? 0
    this._cumulativeDD = Math.max(-15, Math.min(0,
      this._cumulativeDD + (lastPnl < 0 ? randomNormal(-0.3, 0.15) : randomNormal(0.1, 0.08))
    ))
    const point: DrawdownPoint = {
      time:  new Date().toLocaleTimeString('en-US', { hour12: false }),
      value: parseFloat(this._cumulativeDD.toFixed(2)),
    }
    this.state = {
      ...this.state,
      drawdownHistory: [...this.state.drawdownHistory.slice(1), point],
    }
    this._emit()
  }

  private _tripFlashCrash() {
    // Momentarily trip flashCrash to false for 3s to simulate a detection event
    this.state = {
      ...this.state,
      circuitBreakers: { ...this.state.circuitBreakers, flashCrash: false },
    }
    this._emit()
    setTimeout(() => {
      this.state = {
        ...this.state,
        circuitBreakers: { ...this.state.circuitBreakers, flashCrash: true },
      }
      this._emit()
    }, 3000)
  }

  // public setter — called from context when user moves a slider
  setRiskLimits(limits: Partial<RiskLimits>) {
    this.state = { ...this.state, riskLimits: { ...this.state.riskLimits, ...limits } }
    this._emit()
  }

  // public setter — called from context when user flips a breaker
  setCircuitBreakers(breakers: Partial<CircuitBreakers>) {
    this.state = { ...this.state, circuitBreakers: { ...this.state.circuitBreakers, ...breakers } }
    this._emit()
  }

  // public — called from Liquidity tab "Enter Position" button
  sendToStrategy(poolName: string) {
    const pool = this.state.pools.find(p => p.name === poolName)
    if (!pool) return
    const now = nowStr()
    const newSignal: Signal = {
      id: `pool-${Date.now()}`,
      pair: pool.name,
      strategy: 'ARBITRAGE',
      expectedProfit: parseFloat((Math.random() * 4 + 0.5).toFixed(2)),
      confidence: Math.floor(50 + Math.random() * 44),
      riskScore: Math.ceil(Math.random() * 3),
      entryPrice: this.state.prices[pool.name]?.price ?? 0,
      exitPrice:  0,
      timestamp:  now,
    }
    const signals = [newSignal, ...this.state.signals].slice(0, 6)
    signals.sort((a, b) => b.confidence - a.confidence)
    this.state = { ...this.state, signals }
    this._activateAgent('Strategy')
    this._emit()
  }

  // get previous pool APRs for flash detection in UI
  getPrevAprs(): Record<string, number> { return { ...this._prevPoolAprs } }

  // ── Orchestrator Patch Methods ──────────────────────────────────────────────
  patchPrice(pair: string, price: number) {
    if (!this.state.prices[pair]) return
    const prev = this.state.prices[pair].price
    const change = price - prev
    const pct = prev > 0 ? (change / prev) * 100 : 0
    this.state = {
      ...this.state,
      prices: {
        ...this.state.prices,
        [pair]: { price, prev, change, changePercent: pct }
      }
    }
    this._emit()
  }

  patchSignals(signals: any[]) {
    this.state = { ...this.state, signals }
    this._emit()
  }

  patchTrade(trade: any) {
    // We unshift to trades array and update PnL
    const newTrades = [trade, ...this.state.trades].slice(0, 50)
    const isWin = trade.netPnL > 0
    const s = this.state.pnl
    const newTradeCount = s.tradeCount + 1
    const newWinCount = isWin ? s.winCount + 1 : s.winCount
    
    this.state = {
      ...this.state,
      trades: newTrades,
      pnl: {
        total: s.total + trade.netPnL,
        today: s.today + trade.netPnL,
        winRate: (newWinCount / newTradeCount) * 100,
        activeCount: s.activeCount,
        winCount: newWinCount,
        tradeCount: newTradeCount
      }
    }
    this._emit()
  }

  patchBreach(breach: any) {
    this.state = { ...this.state, breachAlert: breach }
    this._emit()
  }

  resetAll() {
    this.state = {
      ...this.state,
      trades: [],
      pnl: { total: 0, today: 0, winRate: 0, activeCount: 0, winCount: 0, tradeCount: 0 },
      breachAlert: null,
      activity: []
    }
    this._emit()
  }

  patchActivity(payload: any) {
    const act: ActivityEntry = {
      id: `ACT-${Date.now()}-${Math.random()}`,
      ts: new Date(payload.timestamp).toLocaleTimeString('en-US', { hour12: false }),
      agent: payload.agent as AgentName,
      message: payload.message,
    }
    this.state = {
      ...this.state,
      activity: [act, ...this.state.activity].slice(0, 50)
    }
    this._emit()
  }

  patchAgentState(agentState: any) {
    // Merge agent state
    const agents = this.state.agents.map(a => {
      let active = a.active
      if (a.name === 'Market Intel' && agentState.marketIntel === 'ONLINE') active = true
      // add logic mapping if needed, simplified for demo
      return { ...a, active }
    })
    this.state = { ...this.state, agents }
    this._emit()
  }

  patchRegime(regimeLabel: string) {
    if (this.state.marketRegime.current === regimeLabel) return
    const now = nowStr()
    const entry: RegimeHistoryEntry = {
      regime: this.state.marketRegime.current,
      timestamp: this.state.marketRegime.updatedAt,
      duration: '1m+' // simplified
    }
    this.state = {
      ...this.state,
      marketRegime: { current: regimeLabel as RegimeLabel, confidence: 95, updatedAt: now },
      regimeHistory: [entry, ...this.state.regimeHistory].slice(0, 5)
    }
    this._emit()
  }

  private _tickEquity() {
    const last  = this.state.equityCurve[this.state.equityCurve.length - 1]
    const delta = this.state.trades[0]?.pnl ?? randomNormal(0.4, 2)
    const newPnL = parseFloat(Math.max(0, last.totalPnL + delta).toFixed(2))
    const point: EquityPoint = {
      time:      nowStr(),
      totalPnL:  newPnL,
      benchmark: parseFloat((newPnL * 0.72).toFixed(2)),
    }
    this.state = {
      ...this.state,
      equityCurve:   [...this.state.equityCurve.slice(1), point],
      gasEfficiency: Math.max(60, Math.min(98, this.state.gasEfficiency + randomNormal(0, 0.3))),
    }
    this._activateAgent('Portfolio')
    this._emit()
  }

  private _tickRegime() {
    const prev = this.state.marketRegime
    this._regimeIdx = (this._regimeIdx + 1) % REGIME_SEQUENCE.length
    const next = REGIME_SEQUENCE[this._regimeIdx]
    const now = nowStr()

    const entry: RegimeHistoryEntry = {
      regime: prev.current,
      timestamp: prev.updatedAt,
      duration: `${Math.floor(Math.random() * 20 + 5)}m`,
    }

    this.state = {
      ...this.state,
      marketRegime: { current: next, confidence: Math.floor(60 + Math.random() * 35), updatedAt: now },
      regimeHistory: [entry, ...this.state.regimeHistory].slice(0, 5),
    }
    this._activateAgent('Market Intel')
    this._emit()
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const engine = new MockDataEngine()
