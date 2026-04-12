# PancakeSwap Autonomous Trading Agent System

> Technical General Championship 2026 — PancakeSwap × IIT Roorkee

A multi-agent AI system that autonomously identifies and executes trading opportunities on PancakeSwap across BNB Chain and Arbitrum.

## Team

| Person | Role | Core Ownership |
|--------|------|----------------|
| **Person 1** | Data & Intelligence | Market Intelligence Agent, Liquidity Analysis Agent, Data Pipeline, MarketState Publisher |
| **Person 2** | Strategy & Execution | Strategy Agent, Execution Agent, Simulation Agent, On-chain Routing |
| **Person 3** | Risk & Portfolio | Risk Management Agent, Portfolio Agent, React/Vite Dashboard |

## Architecture Overview

```text
Market Intelligence Agent (P1)
   │
   ├─ [Emits: market:update]
   ▼
Orchestrator (Typed Event Bus)
   │
   ├─► Strategy Agent (P2)
   │     └─ [Emits: strategy:signal]
   │
   ├─► Risk Management Agent (P3)
   │     ├─ [Reads: strategy:signal]
   │     └─ [Emits: risk:decision]
   │
   ├─► Execution Agent (P2)
   │     ├─ [Reads: risk:decision]
   │     └─ [Emits: execution:trade]
   │
   └─► Portfolio Agent (P3)
         └─ [Reads: execution:trade] → Updates Dashboard
```

## Folder Structure

```text
pancakeswap-agent/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── packages/
│   ├── core/                        # Shared Types & Orchestrator
│   ├── agents/
│   │   ├── market-intelligence/     # P1: Subgraph & RPC Data
│   │   ├── liquidity/               # P1: V2/V3 Mapping & IL Math
│   │   ├── strategy/                # P2: Signal Generation
│   │   ├── execution/               # P2: DEX Routing & MEV Protection
│   │   ├── simulation/              # P2: Historical Backtesting
│   │   ├── risk/                    # P3: Limits & Circuit Breakers
│   │   └── portfolio/               # P3: P&L & Analytics
│   ├── dashboard/                   # P3: React + Vite Frontend
│   └── contracts/                   # Solidty standard contracts
```

## Core Agent Interfaces

All agents MUST respect the interfaces defined in `packages/core/src/types.ts`.

- `MarketState`: Published by P1. Contains pools, regime, gas price.
- `TradeSignal`: Published by P2. Proposes an execution.
- `RiskDecision`: Published by P3. Approves or denies a `TradeSignal`.
- `TradeEvent`: Published by P2. The receipt of an execution.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` in the root (and in package directories if needed).
   ```text
   RPC_URL_BSC=https://your-bsc-rpc-endpoint
   RPC_URL_ARB=https://your-arb-rpc-endpoint
   PRIVATE_KEY=your_testnet_wallet_private_key
   PANCAKESWAP_SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc
   CHAIN_ID=97 # 97 for BSC Testnet
   ```

3. **Funding your Testnet Wallet**
   Visit the [BSC Testnet Faucet](https://testnet.bnbchain.org/faucet-smart) and request test BNB.

## Running Agents

You can run individual agents using npm workspaces from the root:
```bash
# Run Market Intelligence Agent (Person 1)
npm run start --workspace=@pancakeswap-agent/market-intelligence

# Run Strategy Agent (Person 2)
npm run start --workspace=@pancakeswap-agent/strategy

# Run Execution Agent (Person 2)
npm run start --workspace=@pancakeswap-agent/execution

# Run Dashboard (Person 3)
npm run dev --workspace=@pancakeswap-agent/dashboard
```

## Person 2 Delivery (Strategy + Execution)

Person 2 implementation now includes:

- `@pancakeswap-agent/strategy`
   - `arbitrage_detector.ts`: Pairwise cross-pool discrepancy detection and estimated profit ranking.
   - `signal_builder.ts`: Regime-aware sizing + confidence mapping into `TradeSignal`.
   - `index.ts`: Subscribes to `market:update` and emits best `strategy:signal` each cycle.

- `@pancakeswap-agent/execution`
   - `router.ts`: PancakeSwap V3 `exactInputSingle` transaction submission via `viem` on BSC Testnet.
   - `gas_estimator.ts`: Gas cost estimation helpers.
   - `index.ts`: Caches signals, executes approved risk decisions, and emits `execution:trade`.

Additional environment variables used by Person 2 agents:

```text
RPC_URL_BSC=https://bsc-testnet-rpc-url
PRIVATE_KEY=0x<64-hex-private-key>
WALLET_ADDRESS=0x<recipient-wallet-address>
```

## Development Rules

1. **Testnet ONLY**: No mainnet keys until final integration.
2. **Branch Naming**: `p1/feature-name`, `p2/feature-name`, `p3/feature-name`.
3. **No Private Keys in Git**: Never commit `.env` or `.env.local`.
4. **Strict TypeScript**: Do not use `any`. Use `zod` for parsing unknown I/O data.

## Team Handover & Starting Points

Review [**TEAM_GUIDE.md**](./TEAM_GUIDE.md) for concrete steps on how Person 2 and Person 3 can start hooking into the Orchestrator bus immediately.

## Current Status

- [ ] Repository Scaffolded
- [ ] Core Interfaces Defined
- [ ] P1: Market Intelligence Agent (Live pool queries)
- [x] P2: Strategy Agent (arbitrage signal emission)
- [x] P2: Execution Router logic
- [ ] P3: Risk Middleware
- [ ] P3: WebSocket Dashboard
