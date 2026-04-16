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
}

export interface Pool {
  name: string; version: 'V2' | 'V3'; tier: 'BLUE-CHIP' | 'MID-CAP' | 'DEGEN'
  fee: string; tvl: number; vol24h: number; aprRaw: number; apr: string; arb: boolean
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
  positionExposure: PositionExposure[]
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
  { name: 'BNB/BUSD',  version: 'V3', tier: 'BLUE-CHIP', fee: '0.05%', tvl: 1.08e12, vol24h: 1.24e6,  aprRaw: 14.1,  apr: '14.1%',  arb: false },
  { name: 'CAKE/BNB',  version: 'V3', tier: 'MID-CAP',   fee: '0.25%', tvl: 2.40e12, vol24h: 320e3,   aprRaw: 47.2,  apr: '47.2%',  arb: true  },
  { name: 'ETH/USDC',  version: 'V3', tier: 'BLUE-CHIP', fee: '0.05%', tvl: 720e6,   vol24h: 78e3,    aprRaw: 12.2,  apr: '12.2%',  arb: false },
  { name: 'BTCB/USDT', version: 'V2', tier: 'BLUE-CHIP', fee: '0.25%', tvl: 441e6,   vol24h: 48e3,    aprRaw: 9.8,   apr: '9.8%',   arb: false },
  { name: 'XRP/USDT',  version: 'V2', tier: 'MID-CAP',   fee: '0.25%', tvl: 128e6,   vol24h: 22e3,    aprRaw: 31.4,  apr: '31.4%',  arb: false },
  { name: 'SHIB/BUSD', version: 'V2', tier: 'DEGEN',     fee: '1.00%', tvl: 18e6,    vol24h: 4200,    aprRaw: 124.7, apr: '124.7%', arb: false },
]

const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false })

// ── Engine ────────────────────────────────────────────────────────────────────
export class MockDataEngine {
  private listeners: Set<Listener> = new Set()
  private timers: ReturnType<typeof setInterval>[] = []
  state: EngineState

  // track regime index for rotation
  private _regimeIdx = 0
  // track cumulative drawdown for history
  private _cumulativeDD = 0

  constructor() {
    const now = new Date().toLocaleTimeString('en-US', { hour12: false })
    // seed 30-point drawdown history
    const ddHistory: DrawdownPoint[] = Array.from({ length: 30 }, (_, i) => ({
      time: now,
      value: -(Math.abs(Math.sin(i / 6)) * 5 + Math.random() * 1.2),
    }))
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
      pools: POOL_INIT.map(p => ({ ...p })),
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
      positionExposure: [
        { token: 'WBNB', exposure: '$845.20', portfolioPct: '58.3%', riskLevel: 'LOW'    },
        { token: 'USDT', exposure: '$412.00', portfolioPct: '28.4%', riskLevel: 'LOW'    },
        { token: 'CAKE', exposure: '$193.40', portfolioPct: '13.3%', riskLevel: 'MEDIUM' },
      ],
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.state) // immediate first emit
    return () => this.listeners.delete(fn)
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
    }

    const s = this.state.pnl
    const newTradeCount = s.tradeCount + 1
    const newWinCount   = isWin ? s.winCount + 1 : s.winCount

    // Update position exposure to reflect new trade token
    const baseToken = pair.split('/')[0]
    const exposure  = this.state.positionExposure.map(e => {
      if (e.token === baseToken || e.token === 'W' + baseToken) {
        const delta = Math.abs(pnl) * 0.3
        const raw   = parseFloat(e.exposure.replace('$','')) + (isWin ? delta : -delta)
        const capped = Math.max(50, raw)
        return { ...e, exposure: `$${capped.toFixed(2)}` }
      }
      return e
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
    // Auto-disarm: if anomaly breaches riskLimits.anomalyScore threshold, trip maxDrawdown breaker
    const breakers = { ...this.state.circuitBreakers }
    if (newAnomaly > this.state.riskLimits.anomalyScore && breakers.maxDrawdown) {
      breakers.maxDrawdown = false
      // schedule auto-reset after 5s
      setTimeout(() => {
        this.state = { ...this.state, circuitBreakers: { ...this.state.circuitBreakers, maxDrawdown: true } }
        this._emit()
      }, 5000)
    }
    this.state = { ...this.state, risk: newRisk, circuitBreakers: breakers }
    this._activateAgent('Risk')
    this._emit()
  }

  private _tickPools() {
    const pools = this.state.pools.map(p => {
      const arbTriggered = Math.random() < 0.15
      const newVol = p.vol24h * (1 + randomNormal(0, 0.02))
      const newApr = parseFloat((p.aprRaw * (1 + randomNormal(0, 0.005))).toFixed(1))
      if (arbTriggered && !p.arb) this._activateAgent('Market Intel')
      return { ...p, vol24h: Math.max(1000, newVol), aprRaw: Math.max(1, newApr), apr: `${Math.max(1, newApr).toFixed(1)}%`, arb: arbTriggered }
    })
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
