// /src/data/constants.ts
// Centralised constants used across the NEXUS data layer and UI
import { theme } from '../styles/theme'

export const PAIRS = ['BNB/USDC', 'CAKE/BNB', 'ETH/USDC', 'BTCB/USDT', 'XRP/USDT'] as const
export type Pair = typeof PAIRS[number]

export const AGENT_NAMES = [
  'Market Intel', 'Strategy', 'Execution', 'Risk', 'Portfolio', 'Liquidity', 'Simulation',
] as const
export type AgentName = typeof AGENT_NAMES[number]

export const AGENT_COLORS: Record<AgentName, string> = theme.agent

export const STRATEGY_TYPES = ['ARBITRAGE', 'TREND', 'MEAN-REVERSION'] as const
export type StrategyType = typeof STRATEGY_TYPES[number]

export const RISK_TIERS = ['BLUE-CHIP', 'MID-CAP', 'DEGEN'] as const
export type RiskTier = typeof RISK_TIERS[number]

export const TIER_BADGE_COLOR: Record<RiskTier, 'cyan' | 'amber' | 'red'> = {
  'BLUE-CHIP': 'cyan',
  'MID-CAP':   'amber',
  'DEGEN':     'red',
}

export const DEFAULT_POOL_DATA = [
  { name: 'BNB/BUSD',  version: 'V3', tier: 'BLUE-CHIP' as RiskTier, fee: '0.05%', tvl: 1.08e12, vol24h: 1.24e6,  aprRaw: 14.1,  apr: '14.1%',  arb: false },
  { name: 'CAKE/BNB',  version: 'V3', tier: 'MID-CAP'   as RiskTier, fee: '0.25%', tvl: 2.40e12, vol24h: 320e3,   aprRaw: 47.2,  apr: '47.2%',  arb: true  },
  { name: 'ETH/USDC',  version: 'V3', tier: 'BLUE-CHIP' as RiskTier, fee: '0.05%', tvl: 720e6,   vol24h: 78e3,    aprRaw: 12.2,  apr: '12.2%',  arb: false },
  { name: 'BTCB/USDT', version: 'V2', tier: 'BLUE-CHIP' as RiskTier, fee: '0.25%', tvl: 441e6,   vol24h: 48e3,    aprRaw: 9.8,   apr: '9.8%',   arb: false },
  { name: 'XRP/USDT',  version: 'V2', tier: 'MID-CAP'   as RiskTier, fee: '0.25%', tvl: 128e6,   vol24h: 22e3,    aprRaw: 31.4,  apr: '31.4%',  arb: false },
  { name: 'SHIB/BUSD', version: 'V2', tier: 'DEGEN'     as RiskTier, fee: '1.00%', tvl: 18e6,    vol24h: 4200,    aprRaw: 124.7, apr: '124.7%', arb: false },
]

// ── Tab navigation ────────────────────────────────────────────────────────────
export const TABS = [
  { label: 'Market',    path: '/market'    },
  { label: 'Strategy',  path: '/strategy'  },
  { label: 'Execution', path: '/execution' },
  { label: 'Risk',      path: '/risk'      },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Liquidity', path: '/liquidity' },
]

// ── Tab → Agent ownership breadcrumb ─────────────────────────────────────────
export const TAB_AGENTS: Record<string, { name: string; color: string; icon: string; agentKey: string }> = {
  market:    { name: 'Market Intelligence', color: theme.tab.market,    icon: '◈', agentKey: 'Market Intel' },
  strategy:  { name: 'Strategy Agent',      color: theme.tab.strategy,  icon: '◆', agentKey: 'Strategy'     },
  execution: { name: 'Execution Agent',     color: theme.tab.execution, icon: '▶', agentKey: 'Execution'    },
  risk:      { name: 'Risk Management',     color: theme.tab.risk,      icon: '⬡', agentKey: 'Risk'         },
  portfolio: { name: 'Portfolio Agent',     color: theme.tab.portfolio, icon: '◉', agentKey: 'Portfolio'    },
  liquidity: { name: 'Liquidity Agent',     color: theme.tab.liquidity, icon: '◎', agentKey: 'Liquidity'   },
}
