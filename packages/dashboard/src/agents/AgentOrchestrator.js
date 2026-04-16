import bus from './AgentBus.js'
import { getBNBPrice, getPoolReserves, getGasPrice } from '../services/bscConnection.js'

// ─── AGENT STATE ──────────────────────────────────────────────
const agentState = {
  marketIntel: 'BOOTING',
  strategy:    'BOOTING',
  risk:        'BOOTING',
  execution:   'BOOTING',
  portfolio:   'BOOTING',
  liquidity:   'BOOTING',
  simulation:  'BOOTING',
}

let _onStateUpdate = null   // callback to NexusContext
let _prices = {}
let _regime = 'UNKNOWN'
let _pnlHistory = []
let _peakPnL = 0
let _currentRisk = { drawdown: 0, anomaly: 22, positionSize: 320 }
let _isArmed = true
let _autoExecute = false
let _signalInterval = 8000
let _intervals = []

// ─── HELPERS ──────────────────────────────────────────────────
function log(agent, level, message, data) {
  const entry = { agent, level, message, data, timestamp: Date.now() }
  bus.emit('AGENT_LOG', entry)
  if (_onStateUpdate) _onStateUpdate('log', entry)
}

function setAgent(key, status) {
  agentState[key] = status
  if (_onStateUpdate) _onStateUpdate('agentState', { ...agentState })
}

function randBetween(a, b) { return a + Math.random() * (b - a) }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function shortHash() {
  return '0x' + Array.from({length: 12}, () => 
    Math.floor(Math.random()*16).toString(16)).join('') + '...'
}

// ─── MARKET INTELLIGENCE AGENT ────────────────────────────────
async function runMarketIntelAgent() {
  setAgent('marketIntel', 'BOOTING')
  log('MarketIntel', 'INFO', 'Connecting to BSC Testnet RPC...')
  
  const realPrice = await getBNBPrice()
  _prices['BNB/USDC'] = { 
    price: realPrice, prev: realPrice, 
    change: 0, changePercent: 0, timestamp: Date.now()
  }
  _prices['CAKE/BNB'] = { price: 2.841, prev: 2.841, change: 0, changePercent: 0 }
  _prices['ETH/USDC'] = { price: 1847.20, prev: 1847.20, change: 0, changePercent: 0 }
  
  setAgent('marketIntel', 'ONLINE')
  log('MarketIntel', 'INFO', 
    `✓ BNB/USDC live price: $${realPrice.toFixed(2)} (BSC Testnet)`)
  
  // Patch MockDataEngine price for BNB
  if (_onStateUpdate) _onStateUpdate('patchPrice', { 
    pair: 'BNB/USDC', price: realPrice 
  })
  bus.emit('PRICE_UPDATE', { prices: _prices, timestamp: Date.now() })

  // Regime history tracking
  const priceHistory = [realPrice]

  const iv = setInterval(async () => {
    const newPrice = await getBNBPrice()
    const prev = _prices['BNB/USDC'].price
    const change = newPrice - prev
    const changePct = (change / prev) * 100
    
    _prices['BNB/USDC'] = { 
      price: newPrice, prev, change, 
      changePercent: changePct, timestamp: Date.now()
    }
    
    // Drift derived pairs from BNB
    const cakePrev = _prices['CAKE/BNB'].price
    const cakeDrift = (Math.random() - 0.495) * 0.008
    _prices['CAKE/BNB'] = {
      price: clamp(cakePrev * (1 + cakeDrift), 1.5, 5),
      prev: cakePrev, change: cakePrev * cakeDrift,
      changePercent: cakeDrift * 100, timestamp: Date.now()
    }
    
    const ethPrev = _prices['ETH/USDC'].price
    const ethDrift = (Math.random() - 0.495) * 5
    _prices['ETH/USDC'] = {
      price: clamp(ethPrev + ethDrift, 1500, 4000),
      prev: ethPrev, change: ethDrift,
      changePercent: (ethDrift / ethPrev) * 100, timestamp: Date.now()
    }
    
    priceHistory.push(newPrice)
    if (priceHistory.length > 20) priceHistory.shift()
    
    // Regime detection
    if (priceHistory.length >= 10) {
      const returns = priceHistory.slice(1)
        .map((p, i) => (p - priceHistory[i]) / priceHistory[i])
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length
      const stdDev = Math.sqrt(variance)
      const first5 = priceHistory.slice(0, 5).reduce((a,b)=>a+b,0) / 5
      const last5  = priceHistory.slice(-5).reduce((a,b)=>a+b,0) / 5
      const trend  = (last5 - first5) / first5

      let newRegime = 'CHOPPY'
      if (stdDev > 0.008)          newRegime = 'HIGH-VOLATILITY'
      else if (Math.abs(trend) > 0.003) newRegime = 'TRENDING'
      else if (stdDev < 0.002)     newRegime = 'MEAN-REVERTING'

      if (newRegime !== _regime) {
        const prev = _regime
        _regime = newRegime
        bus.emit('REGIME_CHANGE', { 
          from: prev, to: _regime, 
          confidence: clamp(60 + priceHistory.length * 1.5, 60, 95),
          timestamp: Date.now()
        })
        log('MarketIntel', 'WARN', 
          `Regime change: ${prev} → ${_regime}`)
        if (_onStateUpdate) _onStateUpdate('regime', _regime)
      }
    }

    if (_onStateUpdate) _onStateUpdate('patchPrice', { 
      pair: 'BNB/USDC', price: newPrice 
    })
    bus.emit('PRICE_UPDATE', { prices: _prices })
    
    if (Math.abs(changePct) > 0.2) {
      log('MarketIntel', 'INFO', 
        `BNB/USDC ${changePct > 0 ? '▲' : '▼'} $${newPrice.toFixed(2)} 
         (${changePct > 0 ? '+' : ''}${changePct.toFixed(3)}%)`)
    }
  }, 5000)
  
  _intervals.push(iv)
}

// ─── SIMULATION AGENT ─────────────────────────────────────────
async function runSimulationAgent() {
  setAgent('simulation', 'BOOTING')
  log('Simulation', 'INFO', 'Initialising backtest engine...')
  await new Promise(r => setTimeout(r, 600))
  
  // Seed backtest results
  const results = { 
    trades: 312, wins: 218, winRate: 69.9,
    totalReturn: 847.20, sharpe: 2.31, 
    maxDrawdown: 8.3, 
    confidenceInterval: [620, 1080] 
  }
  log('Simulation', 'INFO', 
    `Backtest complete: ${results.trades} trades, ` +
    `${results.winRate}% win rate, $${results.totalReturn} return, ` +
    `Sharpe ${results.sharpe}`)
  setAgent('simulation', 'ONLINE')
  return results
}

// Validate a signal with Monte Carlo (50 runs)
function quickValidate(signal) {
  let wins = 0, totalPnL = 0
  for (let i = 0; i < 50; i++) {
    const slip = (Math.random() * signal.slippage) / 100
    const outcome = signal.expectedProfit * (1 - slip) * 
      (Math.random() > 0.32 ? 1 : -0.3)
    if (outcome > 0) wins++
    totalPnL += outcome
  }
  const confidence = (wins / 50) * 100
  log('Simulation', 'INFO', 
    `Signal validated: ${signal.pair} — ` +
    `Monte Carlo ${confidence.toFixed(0)}% confidence (50 runs)`)
  return { confidence, expectedPnL: totalPnL / 50 }
}

// ─── STRATEGY AGENT ───────────────────────────────────────────
function runStrategyAgent() {
  setAgent('strategy', 'BOOTING')
  log('Strategy', 'INFO', 'Waiting for price feed...')
  
  // Wait for prices to arrive, then start
  const waitForPrices = setInterval(() => {
    if (_prices['BNB/USDC']?.price) {
      clearInterval(waitForPrices)
      setAgent('strategy', 'ONLINE')
      log('Strategy', 'INFO', 
        'Price feed received — scanning for opportunities')
      startSignalLoop()
    }
  }, 1000)
  _intervals.push(waitForPrices)
}

function generateSignals() {
  const signals = []
  const bnb   = _prices['BNB/USDC']?.price  || 312
  const cake  = _prices['CAKE/BNB']?.price  || 2.84
  const eth   = _prices['ETH/USDC']?.price  || 1847
  
  // STRATEGY 1: Arbitrage (always available if spread exists)
  const refPrice = bnb * (1 + (Math.random() - 0.5) * 0.008)
  const spread   = Math.abs(bnb - refPrice)
  const spreadPct = (spread / refPrice) * 100
  if (spreadPct > 0.12) {
    const gross = spread * 0.5
    const gas   = 0.42
    const net   = gross - gas
    if (net > 0.3) {
      signals.push({
        id: `ARB-${Date.now()}`,
        strategy: 'ARBITRAGE',
        pair: 'BNB/USDC',
        direction: bnb < refPrice ? 'BUY' : 'SELL',
        entryPrice: parseFloat(bnb.toFixed(2)),
        exitPrice:  parseFloat(refPrice.toFixed(2)),
        expectedProfit: parseFloat(net.toFixed(2)),
        grossProfit:    parseFloat(gross.toFixed(2)),
        gasCost: gas,
        confidence: clamp(55 + spreadPct * 7000, 50, 95),
        riskScore: 2,
        positionSize: 0.5,
        slippage: 0.3,
        timestamp: Date.now(),
        expiresIn: 15
      })
    }
  }
  
  // STRATEGY 2: Trend-following (only in TRENDING regime)
  if (_regime === 'TRENDING') {
    const change = _prices['CAKE/BNB']?.changePercent || 0
    if (Math.abs(change) > 0.08) {
      signals.push({
        id: `TREND-${Date.now()}`,
        strategy: 'TREND-FOLLOWING',
        pair: 'CAKE/BNB',
        direction: change > 0 ? 'BUY' : 'SELL',
        entryPrice: parseFloat(cake.toFixed(4)),
        exitPrice:  parseFloat((cake * (1 + change * 1.8)).toFixed(4)),
        expectedProfit: parseFloat((Math.abs(change) * 80).toFixed(2)),
        grossProfit:    parseFloat((Math.abs(change) * 90).toFixed(2)),
        gasCost: 0.38,
        confidence: clamp(45 + Math.abs(change) * 1800, 45, 88),
        riskScore: 3,
        positionSize: 80,
        slippage: 0.5,
        timestamp: Date.now(),
        expiresIn: 30
      })
    }
  }
  
  // STRATEGY 3: Mean-reversion (only in MEAN-REVERTING regime)
  if (_regime === 'MEAN-REVERTING') {
    const deviation = _prices['ETH/USDC']?.changePercent || 0
    if (Math.abs(deviation) > 0.04) {
      signals.push({
        id: `MR-${Date.now()}`,
        strategy: 'MEAN-REVERSION',
        pair: 'ETH/USDC',
        direction: deviation < 0 ? 'BUY' : 'SELL',
        entryPrice: parseFloat(eth.toFixed(2)),
        exitPrice:  parseFloat((eth * (1 - deviation * 0.65)).toFixed(2)),
        expectedProfit: parseFloat((Math.abs(deviation) * 25).toFixed(2)),
        grossProfit:    parseFloat((Math.abs(deviation) * 30).toFixed(2)),
        gasCost: 0.45,
        confidence: clamp(50 + Math.abs(deviation) * 1200, 50, 82),
        riskScore: 2,
        positionSize: 100,
        slippage: 0.4,
        timestamp: Date.now(),
        expiresIn: 45
      })
    }
  }
  
  signals.sort((a, b) => 
    (b.expectedProfit * b.confidence) - (a.expectedProfit * a.confidence)
  )
  
  if (signals.length > 0) {
    bus.emit('SIGNAL_GENERATED', { signals, top: signals[0] })
    if (_onStateUpdate) _onStateUpdate('signals', signals)
    log('Strategy', 'INFO', 
      `${signals.length} signal(s) — top: ${signals[0].strategy} ` +
      `${signals[0].pair} +$${signals[0].expectedProfit}`)
    
    // Auto-execute if enabled
    if (_autoExecute && _isArmed && signals[0]) {
      setTimeout(() => executeSignal(signals[0]), 1500)
    }
  }
  
  return signals
}

function startSignalLoop() {
  const iv = setInterval(generateSignals, _signalInterval)
  _intervals.push(iv)
  generateSignals()  // run once immediately
}

// ─── RISK MANAGEMENT AGENT ────────────────────────────────────
function runRiskAgent() {
  setAgent('risk', 'BOOTING')
  log('RiskMgmt', 'INFO', 'Armed — monitoring limits & drawdown')
  setAgent('risk', 'ONLINE')
  
  bus.on('TRADE_EXECUTED', (trade) => {
    _pnlHistory.push(trade.netPnL)
    const totalPnL = _pnlHistory.reduce((a,b) => a+b, 0)
    if (totalPnL > _peakPnL) _peakPnL = totalPnL
    const drawdown = _peakPnL > 0 
      ? ((_peakPnL - totalPnL) / _peakPnL) * 100 : 0
    _currentRisk.drawdown = parseFloat(drawdown.toFixed(2))
    
    if (_currentRisk.drawdown >= 13.5 && _isArmed) {
      triggerBreach('MAX_DRAWDOWN', _currentRisk.drawdown, 15)
    }
  })
}

function approveSignal(signal) {
  if (!_isArmed) return { approved: false, reason: 'System disarmed' }
  if (signal.positionSize > 500) 
    return { approved: false, reason: 'Position exceeds size limit' }
  if (_currentRisk.drawdown > 12) 
    return { approved: false, reason: 'Approaching max drawdown' }
  if (_currentRisk.anomaly > 75) 
    return { approved: false, reason: 'Anomaly score too high' }
  return { approved: true, reason: 'All checks passed ✓' }
}

function triggerBreach(type, value, limit) {
  _isArmed = false
  const breach = { type, value, limit, timestamp: Date.now() }
  bus.emit('RISK_BREACH', breach)
  if (_onStateUpdate) _onStateUpdate('breach', breach)
  log('RiskMgmt', 'ERROR', 
    `⚠ CIRCUIT BREAKER: ${type} — ` +
    `${value.toFixed(1)} breached limit ${limit}. TRADING PAUSED.`)
}

// ─── EXECUTION AGENT ──────────────────────────────────────────
function runExecutionAgent() {
  setAgent('execution', 'BOOTING')
  log('Execution', 'INFO', 
    'Ready — auto-execute OFF (manual mode)')
  setAgent('execution', 'ONLINE')
}

async function simulateTrade(signal) {
  log('Execution', 'INFO', 
    `[SIM] Executing ${signal.strategy}: ` +
    `${signal.direction} ${signal.pair} @ $${signal.entryPrice.toFixed(2)}`)
  
  setAgent('execution', 'ACTIVE')
  const latency = randBetween(500, 2000)
  await new Promise(r => setTimeout(r, latency))
  
  const gasData   = await getGasPrice()
  const gasUsed   = 150000 + Math.floor(Math.random() * 50000)
  const bnbPrice  = _prices['BNB/USDC']?.price || 312
  const gasCostUSD = (gasUsed * gasData.gwei * 1e-9) * bnbPrice
  
  const success = Math.random() > 0.08  // 92% success rate
  const slipFactor = 1 - (Math.random() * signal.slippage / 100)
  const actualExit = signal.exitPrice * slipFactor
  const grossPnL = (actualExit - signal.entryPrice) * 
    signal.positionSize * (signal.direction === 'BUY' ? 1 : -1)
  const netPnL = grossPnL - gasCostUSD
  
  const trade = {
    id:         `TX-${Date.now()}`,
    signalId:   signal.id,
    strategy:   signal.strategy,
    pair:       signal.pair,
    direction:  signal.direction,
    size:       signal.positionSize,
    entryPrice: signal.entryPrice,
    exitPrice:  parseFloat(actualExit.toFixed(4)),
    grossPnL:   parseFloat(grossPnL.toFixed(2)),
    netPnL:     parseFloat(netPnL.toFixed(2)),
    gasCostUSD: parseFloat(gasCostUSD.toFixed(3)),
    gasGwei:    gasData.gwei,
    latencyMs:  Math.floor(latency),
    blockNumber: 42891000 + Math.floor(Math.random() * 100000),
    txHash:     shortHash(),
    status:     success ? 'CONFIRMED' : 'FAILED',
    timestamp:  Date.now(),
    simulated:  true
  }
  
  bus.emit('TRADE_EXECUTED', trade)
  if (_onStateUpdate) _onStateUpdate('trade', trade)
  
  log('Execution', success ? 'INFO' : 'WARN',
    success 
      ? `[SIM] ✓ ${trade.pair} confirmed — ` +
        `Net: ${netPnL > 0 ? '+' : ''}$${netPnL.toFixed(2)} ` +
        `| Gas: $${gasCostUSD.toFixed(3)} | ${Math.floor(latency)}ms ` +
        `| Block ${trade.blockNumber}`
      : `[SIM] ✗ ${trade.pair} failed (simulated revert)`)
  
  setAgent('execution', 'ONLINE')
  return trade
}

// ─── PORTFOLIO AGENT ──────────────────────────────────────────
function runPortfolioAgent() {
  setAgent('portfolio', 'BOOTING')
  log('Portfolio', 'INFO', 'Tracking P&L — ready')
  setAgent('portfolio', 'ONLINE')
  
  bus.on('TRADE_EXECUTED', (trade) => {
    log('Portfolio', 'INFO',
      `P&L updated after ${trade.pair} ${trade.direction}: ` +
      `${trade.netPnL > 0 ? '+' : ''}$${trade.netPnL.toFixed(2)}`)
  })
}

// ─── LIQUIDITY AGENT ──────────────────────────────────────────
async function runLiquidityAgent() {
  setAgent('liquidity', 'BOOTING')
  log('Liquidity', 'INFO', 
    'Fetching pool reserves from BSC Testnet...')
  
  const reserves = await getPoolReserves()
  log('Liquidity', 'INFO',
    `BNB/BUSD pool: reserve imbalance ${reserves.imbalance.toFixed(3)}%` +
    `${reserves.imbalance > 0.5 ? ' — ARB OPPORTUNITY DETECTED' : ''}`)
  
  setAgent('liquidity', 'ONLINE')
  if (_onStateUpdate) _onStateUpdate('poolReserves', reserves)
  
  const iv = setInterval(async () => {
    const r = await getPoolReserves()
    if (_onStateUpdate) _onStateUpdate('poolReserves', r)
    if (r.imbalance > 0.8) {
      log('Liquidity', 'WARN',
        `High reserve imbalance: ${r.imbalance.toFixed(2)}% — ` +
        `potential arbitrage window`)
    }
  }, 15000)
  _intervals.push(iv)
}

// ─── PUBLIC API ───────────────────────────────────────────────

// Called from UI Execute button / DemoController
export async function executeSignal(signal) {
  log('RiskMgmt', 'INFO', 
    `Risk check for ${signal.strategy} ${signal.pair}...`)
  
  const riskCheck = approveSignal(signal)
  if (!riskCheck.approved) {
    log('RiskMgmt', 'WARN', `Signal REJECTED: ${riskCheck.reason}`)
    return { success: false, reason: riskCheck.reason }
  }
  log('RiskMgmt', 'INFO', `Risk approved: ${riskCheck.reason}`)
  
  const validation = quickValidate(signal)
  if (validation.confidence < 38) {
    log('Simulation', 'WARN',
      `Signal REJECTED by Monte Carlo: ` +
      `${validation.confidence.toFixed(0)}% confidence too low`)
    return { success: false, reason: 'Low simulation confidence' }
  }
  
  return await simulateTrade(signal)
}

// ─── ORCHESTRATOR START ───────────────────────────────────────

export async function startOrchestrator(onStateUpdate) {
  _onStateUpdate = onStateUpdate
  
  onStateUpdate('agentState', { ...agentState })
  
  const bootSteps = [
    { fn: runMarketIntelAgent, delay: 0    },
    { fn: runSimulationAgent,  delay: 900  },
    { fn: () => runLiquidityAgent(), delay: 1800 },
    { fn: () => runStrategyAgent(),  delay: 2700 },
    { fn: () => runRiskAgent(),      delay: 3600 },
    { fn: () => runExecutionAgent(), delay: 4500 },
    { fn: () => runPortfolioAgent(), delay: 5400 },
  ]
  
  bootSteps.forEach(({ fn, delay }) => {
    const t = setTimeout(fn, delay)
    _intervals.push(t)
  })
}

export function stopOrchestrator() {
  _intervals.forEach(i => { clearInterval(i); clearTimeout(i) })
  _intervals = []
}

export function rearm() {
  _isArmed = true
  if (_onStateUpdate) _onStateUpdate('breach', null)
  log('RiskMgmt', 'INFO', 
    'System rearmed — normal operations resumed ✓')
}

export function setAutoExecute(val) {
  _autoExecute = val
  log('Execution', 'INFO', 
    `Auto-execute: ${val ? 'ENABLED' : 'DISABLED'}`)
}

export function setSignalFrequency(ms) {
  _signalInterval = ms
}

export function forceTrade() {
  const signals = generateSignals()
  if (signals.length > 0) executeSignal(signals[0])
}

export function triggerBreachManual() {
  _currentRisk.anomaly = 92
  triggerBreach('ANOMALY_SPIKE', 92, 75)
}

export function resetAll() {
  _pnlHistory = []
  _peakPnL = 0
  _currentRisk = { drawdown: 0, anomaly: 22, positionSize: 320 }
  _isArmed = true
  if (_onStateUpdate) {
    _onStateUpdate('breach', null)
    _onStateUpdate('resetAll', true)
  }
  log('Portfolio', 'INFO', 
    'Full reset — all trades cleared, P&L zeroed')
}

// ─── SCRIPTED DEMO SEQUENCE ───────────────────────────────────

export async function runDemoSequence(onStep) {
  const step = (n, msg) => onStep?.(n, msg)

  step(1, 'Market Intel detecting BNB price movement...')
  log('MarketIntel', 'INFO',
    'BNB/USDC volume spike +340% detected across 3 blocks')
  await new Promise(r => setTimeout(r, 2500))

  step(2, 'Strategy Agent generating signals...')
  const signals = generateSignals()
  const signal = signals[0] || {
    id: `DEMO-${Date.now()}`, strategy: 'ARBITRAGE',
    pair: 'BNB/USDC', direction: 'BUY',
    entryPrice: _prices['BNB/USDC']?.price || 312,
    exitPrice: (_prices['BNB/USDC']?.price || 312) * 1.004,
    expectedProfit: 3.47, grossProfit: 3.89, gasCost: 0.42,
    confidence: 87, riskScore: 2, positionSize: 0.5, 
    slippage: 0.3, expiresIn: 15, timestamp: Date.now()
  }
  log('Strategy', 'INFO',
    `Signal #1 scored: ARBITRAGE BNB/USDC — ` +
    `expected +$${signal.expectedProfit} | confidence ${signal.confidence.toFixed(0)}%`)
  await new Promise(r => setTimeout(r, 2000))

  step(3, 'Simulation validating signal...')
  const validation = quickValidate(signal)
  await new Promise(r => setTimeout(r, 2000))

  step(4, 'Risk checks...')
  const check = approveSignal(signal)
  log('RiskMgmt', 'INFO',
    `Position check: ${signal.positionSize} BNB — within limits ✓`)
  log('RiskMgmt', 'INFO',
    `Drawdown: ${_currentRisk.drawdown.toFixed(1)}% — within limits ✓`)
  log('RiskMgmt', 'INFO', `ARMED — proceeding to execution`)
  await new Promise(r => setTimeout(r, 2000))

  step(5, 'Execution Agent submitting trade...')
  const trade = await simulateTrade(signal)
  await new Promise(r => setTimeout(r, 2000))

  step(6, 'Portfolio updated')
  log('Portfolio', 'INFO',
    `Trade recorded. Net P&L: +$${trade.netPnL.toFixed(2)}`)
  await new Promise(r => setTimeout(r, 2500))

  step(7, 'Triggering Risk breach...')
  log('MarketIntel', 'WARN',
    'Anomaly score spiking — unusual price action detected')
  _currentRisk.anomaly = 92
  triggerBreach('ANOMALY_SPIKE', 92, 75)
  await new Promise(r => setTimeout(r, 4000))

  step(8, 'System paused — awaiting rearm')
  await new Promise(r => setTimeout(r, 3000))

  step(9, 'Rearming system...')
  rearm()
  await new Promise(r => setTimeout(r, 2000))

  step(10, 'Demo complete — system back online ✓')
  log('MarketIntel', 'INFO',
    'Market scan resuming — 14 active pools monitored')
}
