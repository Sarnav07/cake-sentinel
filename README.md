# NEXUS — Autonomous DeFi Trading Agent System

**PancakeSwap x IIT Roorkee | Technical General Championship 2026**

NEXUS is a fully autonomous, multi-agent DeFi trading platform built to navigate the volatility of decentralized exchanges without human intervention. By decomposing the trading lifecycle into 7 specialized AI agents—spanning market intelligence, strategy generation, risk management, and execution—NEXUS eliminates emotional bias and latency. It connects securely to the BSC Testnet, pulling live on-chain pricing and liquidity pool telemetry, simulating high-confidence trades validated through rapid Monte Carlo scenarios and guarded by strict algorithmic circuit breakers, ensuring optimal yield capture while neutralizing catastrophic protocol risk.

## Architecture Overview

```text
                      ┌────────────────────────────────────┐
                      │            React UI Layer          │
                      └─┬──────────────────────────────────┤
                        │            NexusContext          │
                        └─────────┬────────────────────────┘
                                  │
          ┌───────────────────────┴────────────────────────┐
          │                  AgentOrchestrator             │
          └─────────┬────────────────────────┬─────────────┘
                    │                        │
             ┌──────┴──────┐          ┌──────┴─────────┐
             │   AgentBus  │◀────────▶│ MockDataEngine │
             └──────┬──────┘          └──────┬─────────┘
                    │                        │
       ┌────────┬───┴────┬────────┬────────┬─┴──────┬────────┐
       │        │        │        │        │        │        │
   ┌───┴──┐ ┌───┴──┐ ┌───┴──┐ ┌───┴──┐ ┌───┴──┐ ┌───┴──┐ ┌───┴──┐
   │Market│ │Strat.│ │ Risk │ │ Exec.│ │ Port.│ │ Liq. │ │ Sim. │
   └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

1. **Market Intelligence**: Fetches live BNB prices from BSC Testnet, detects regime changes (TRENDING vs MEAN-REVERTING), and estimates global volatility.
2. **Strategy Agent**: Subscribes to market regimes and conditionally generates weighted trading signals (Arbitrage, Trend-Following, or Mean-Reversion).
3. **Risk Management**: Enforces absolute position sizing, maximum drawdowns (15%), and tracks anomaly scores to automatically TRIGGER BREACH and disarm the system.
4. **Execution Agent**: Simulates transaction routing, estimates gas, incorporates projected slippage models, and manages fake success/fail ratios.
5. **Portfolio & Performance**: Tracks empirical outcomes from execution, compiling continuous equity curve updates and overall win/loss ratio distributions.
6. **Liquidity Analysis**: Scans PancakeSwap V2 Testnet pairs (e.g., BNB-BUSD) for underlying reserve balances and detects exploitable AMM pool imbalances.
7. **Simulation Agent**: Run rapid 50-cycle Monte Carlo validations upon every generated signal, guaranteeing minimal statistical confidence before forwarding it to Risk.

## Tech Stack

| Layer | Technology | Why We Chose It |
| --- | --- | --- |
| **Frontend Framework** | React 18 & Vite | Lightning fast dev-server, optimized production bundles, scalable component UI. |
| **State & Context** | React Context API | Single-source-of-truth syncing, enabling seamless propagation of complex trading state to all views. |
| **On-Chain Integration** | `ethers.js` (v6) | Standard robust Web3 abstraction; handles fallback RPC networks and contract ABIs dynamically. |
| **DEX Routing** | PancakeSwap V2 Router | Real live testnet data retrieval via `getAmountsOut()` and fundamental reserve analytics. |
| **Agent Coordination** | Vanilla JS `AgentBus` | Lightweight Pub/Sub event emitter, decoupling orchestrations and establishing pure agent autonomy. |
| **UI Aesthetics** | TailwindCSS & Framer Motion | Precision Cyber/Terminal utility styling combined with high framerate orchestrational micro-animations. |

## Quick Start

Ensure you have Node.js installed, then enter the following exactly to clone and run on a fresh machine:

```bash
git clone <repo-url>
cd packages/dashboard
npm install
npm run dev
# Open http://localhost:5173
```
> **Note**: BSC Testnet connection is attempted automatically. If RPC is unavailable, the system falls back to cached prices — all UI features remain functional.

## Demo Guide (60-Second Pitch Walkthrough)

Follow these steps exactly for a smooth live presentation sequence:

1. Open the app. Point to the **AgentStatusBar** — watch the 7 agent dots transition smoothly from a dim booting state to a pulsing online state over the first 6 seconds.
2. Point to the **ActivityFeed** — observe real agent log messages streaming in natively (e.g., *MarketIntel connecting to BSC Testnet*, *Simulation backtest complete*).
3. Point to the **BNB price** in the top StatsBar — emphasize this is a living testnet query response and not simply mock data.
4. Go to the **Strategy** tab — observe active signals naturally arriving within 10-15 seconds. Explain the three dynamic strategy regimes and conditionally gated deployment logic.
5. Click **EXECUTE** on the top signal — highlight the button's multi-stage reactive transition: "● Executing..." → "✓ Confirmed", validating the async state handling.
6. Go to the **Execution** tab — identify the new trade row populated at the top featuring the verified `[SIM]` execution badge.
7. Open the **◈ DEMO** panel (bottom-right toggle). Click "RUN DEMO SEQUENCE". Narrate each of the 10 distinct orchestrator steps actively as they fire sequentially (~60 seconds total).
8. When **TRIGGER BREACH** occurs (step 7), instantly bring attention to the red DISARMED banner appearing across the UI — explaining the reactive circuit breaker infrastructure limiting risk exposure.
9. Click **REARM** manually on the panel — the system resolves back to a safe green monitoring operation.
10. Show the **Portfolio** tab — visualize the dynamically populated equity curve chart responding historically to the demo trades generated.

## Agent Architecture Deep Dive

### 1. Market Intelligence Agent
- **Role**: Feeds the foundational heartbeat of the system. Tracks continuous asset drift vs core pricing. Defines current regime as `TRENDING`, `CHOPPY`, `MEAN-REVERTING`, or `HIGH-VOLATILITY`.
- **Emits**: `PRICE_UPDATE`, `REGIME_CHANGE`
- **On-chain Hooks**: Validates BNB prices by querying Testnet PancakeSwap.
- **UI Integration**: Injects pricing continuously into the top Nav `StatsBar`.

### 2. Strategy Agent
- **Role**: Continuously subscribes to `PRICE_UPDATE` and `REGIME_CHANGE`. Context-shifts between 3 core paradigms: `ARBITRAGE` if high spreads exist, `TREND-FOLLOWING` in directional markets, and `MEAN-REVERSION` if volatility drops.
- **Emits**: `SIGNAL_GENERATED`
- **UI Integration**: Feeds the grid of actionable trade tickets inside the `StrategyPage`.

### 3. Simulation & Backtesting Agent
- **Role**: Snaps a generated signal right before Execution context. Runs a randomized 50-step Monte Carlo validation array assessing random slippage conditions. 
- **Emits**: N/A (Functional direct validation payload)
- **UI Integration**: Generates the final aggregate Confidence bar on the Strategy panel.

### 4. Risk Management Agent
- **Role**: Ultimate algorithmic governance. Hard-rejects any position scale over user-defined limits (e.g., >500 BNB). Maintains global Peak-PnL logic to constantly measure running Drop (Max Drawdown Limit: 15%).
- **Emits**: `RISK_BREACH`
- **UI Integration**: Manages the master "ARMED/DISARMED" switch state propagating downwards from the `RiskPage`.

### 5. Execution Agent
- **Role**: Dispatches approved strategies to the "network". Accounts for simulated transit latency (500-2000ms), factors in exact Gwei network costs via provider fee retrieval, and generates the final net trade accounting metadata.
- **Emits**: `TRADE_EXECUTED`
- **UI Integration**: Spawns confirmed Tx hashes inside the `ExecutionPage` history view.

### 6. Portfolio & Performance Agent
- **Role**: Subscribes to `TRADE_EXECUTED` and normalizes aggregate PnL, gas expenditure, historical win-rate percentages, and relative allocation vectors.
- **Emits**: N/A (Updates master `MockDataEngine`)
- **UI Integration**: Renders the core visual tracking data displayed inside the `PortfolioPage`.

### 7. Liquidity & Pool Analysis Agent
- **Role**: Directly evaluates smart-contract balances looking for automated AMM arbitrage structural inequalities.
- **Emits**: N/A (Appends reserves config directly to State)
- **On-chain Hooks**: Direct `.getReserves()` queries to underlying pool contracts.
- **UI Integration**: Backs the visual volume discrepancy rendering inside the `LiquidityPage`.

## On-Chain Integration

NEXUS makes genuine live connections to retrieve critical decentralized infrastructure data directly utilizing ethers.js configurations within `bscConnection.js`: 
- **BSC Testnet RPC (`Chain ID: 97`)** serves as the connectivity baseline.
- **PancakeSwap V2 Router (`getAmountsOut()`)** evaluates a standardized `WBNB` to `BUSD` mapping proxy, yielding live unadulterated BNB market prices.
- **BNB/BUSD Pair Contract (`getReserves()`)** isolates precise testnet LP balances. 
- **EVM Gas Evaluation (`provider.getFeeData()`)** calculates exact live base-fee mechanics.

To guarantee frontend resilience, a **3-tier RPC fallback system** operates. Standard `primary` node polling drops to `backup` node servers, and finally to `publicnode` infrastructure if Binance endpoints throttle the requests. Cached prices resolve to local browser persistence upon a complete fail. 

*All trade execution is heavily simulated. No real funds are moved. testnet addresses are used for data queries only.*

## Risk Framework

A core pillar of autonomous protocol deployment requires rigid failure constraints protecting raw capital mathematically. The `RiskGuardian` dictates bounds.
- **Drawdown Circuit Breaker**: If equity drops natively beyond `15%` off peak high watermarks, trading execution is aggressively `DISARMED`.
- **Anomaly Scoring**: Volatility variance greater than `75` index score triggers immediate operations suspension.
- **Positional Caps**: No simulated allocation over `500 BNB` receives structural clearance regardless of perceived arbitrage yield.
- **Rearm Procedure**: System continues parsing market data passively during breach; manual `REARM` authorizations restart Execution pipelines instantaneously.

## Judging Criteria Compliance

| Criterion | Status | Location in Codebase | Notes |
| --- | --- | --- | --- |
| **Required Agents** | | | |
| Market Intelligence Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Retrieves live BNB price, calculates drift, detects regime changes |
| Strategy Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Generates signals (ARB, TREND, MR) scoped by confidence/regime |
| Execution Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Simulates testnet latency & gas; tracks EV/MEV labels |
| Risk Management Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Enforces max drawdown, anomaly checks, position size limit |
| Portfolio & Performance Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Tracks PnL, Win Rate, and logs executed trades |
| Liquidity & Pool Analysis Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Connects to BSC Testnet for live pool reserves, checks imbalance |
| Simulation & Backtesting Agent | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Validates signals via Monte Carlo simulating slippage |
| **Required Features** | | | |
| Multi-agent orchestration | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Shared context pub/sub with async sequential booting |
| On-chain data pipeline | ✅ Implemented | `src/services/bscConnection.js` | BSC Testnet RPC with 3-tier fallback, `ethers.js` router calls |
| Strategy engine | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Generates regime-based signal contexts, not hardcoded |
| Risk framework | ✅ Implemented | `src/context/NexusContext.tsx` | Global DISARM circuit breakers |
| Execution layer | ✅ Implemented | `src/agents/AgentOrchestrator.js` | Gas estimations & simulated transit |
| Performance dashboard UI | ✅ Implemented | `src/pages/` | Rich metrics, PnL, live simulated dashboard |
| **Bonus Features** | | | |
| AI memory / RAG | 🟡 Partially Implemented | Repo Root | Framework established but full history indexing is stubbed |
| Reinforcement learning | 🟡 Partially Implemented | Repo Root | Not active; fixed parameters are currently used for strategies |
| Real-time streaming | 🟡 Partially Implemented | `bscConnection.js` | Interval polling used instead of WebSocket pub/sub |
| Simulation dashboard | ✅ Implemented | `src/pages/StrategyPage.tsx` | What-if embedded in signal evaluation logic |
| Agent collaboration visualization| 🟡 Partially Implemented | UI Dashboard | Live system dots track state, fully interactive DAG missing |
| Natural language interface | ❌ Missing | None | Out of scope for this hackathon milestone |
| Prediction market integration | ❌ Missing | None | Out of scope |

## What's Next (Future Work)

Taking NEXUS from a high-fidelity algorithmic testing framework to a live mainnet production environment involves unlocking several technical tiers:
1. **Real Hardware Wallet Injection**: Complete transition from `<ExecutionAgent />` simulation mapping loops securely into `ethers.Wallet` key signing integrations across actual smart contracts.
2. **Dynamic Reinforcement ML Scaling**: Deprecate fixed condition bounds natively replacing threshold heuristics with an underlying adaptive reward/loss optimization matrix. 
3. **Cross-Chain Arbitrage Nodes**: Duplicate current monitoring engines bridging alternative testnets (e.g., Base, Arbitrum) dynamically routing swap pathways utilizing LayerZero structural hooks. 
4. **Private Mempool Flash Submission**: Adopt advanced builder network methodologies securing MEV extraction opportunities absent dark-forest front-running exposure. 

## Team

Built by **Shrishti** — IIT Roorkee
