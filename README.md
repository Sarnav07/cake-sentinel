# NEXUS: Agentic DeFi Intelligence Layer

NEXUS is a multi-agent TypeScript monorepo for autonomous PancakeSwap opportunity detection, risk-gated execution, and live portfolio telemetry.

## Architecture

```text
Market Intelligence Agent
   -> emits market:update

Strategy Agent
   -> consumes market:update
   -> emits strategy:signal

Risk Agent
   -> consumes market:update, strategy:signal, execution:trade
   -> emits risk:decision and risk:circuit_break

Execution Agent
   -> consumes strategy:signal, risk:decision, market:update
   -> emits execution:trade

Portfolio Agent
   -> consumes execution:trade, market:update, risk:circuit_break, agent:status
   -> serves REST + WebSocket API for dashboard

Dashboard (React + Vite)
   -> reads /api/* and WebSocket feed for live terminal UI
```

## Repository Layout

```text
packages/
   core/
   agents/
      market-intelligence/
      liquidity/
      strategy/
      execution/
      risk/
      portfolio/
   dashboard/
contracts/
infra/
docs/
```

## Quick Start

1. Install root dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

3. Build all workspace packages:

```bash
npm run build
```

4. Run all app agents and UI (dev mode):

```bash
npm run dev:all
```

5. Open dashboard:

```text
http://localhost:5173
```

## Contracts

Compile, test, and export ABI files:

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx tsx scripts/export-abis.ts
```

Generated ABIs:

- `contracts/abis/NexusVault.json`
- `contracts/abis/SignalRegistry.json`
- `contracts/abis/AgentLeaderboard.json`

## Testing

Run workspace tests:

```bash
npm run test
```

Run package tests directly:

```bash
npm run test --workspace=@pancakeswap-agent/risk
npm run test --workspace=@pancakeswap-agent/portfolio
npm run test --workspace=@pancakeswap-agent/strategy
npm run test --workspace=@pancakeswap-agent/liquidity
```

Run contract tests:

```bash
cd contracts && npx hardhat test
```

## Dashboard Pages

- `/` dashboard command center with KPI strip, equity chart, activity feed
- `/trades` tabular trade history
- `/analytics` metrics snapshot and performance detail
- `/agents` agent health/state visibility
- `/positions` open position surface
- `/risk` risk status and circuit breaker state
- `/market` live market-state surface

## Key Interface Contracts

Shared runtime types live in `packages/core/src/types.ts`:

- `MarketState`
- `TradeSignal`
- `RiskDecision`
- `TradeEvent`
- `PortfolioSnapshot`
- `AgentStatus`

Shared event bus lives in `packages/core/src/orchestrator.ts`.

## Environment Variables

Required:

- `RPC_URL_BSC`
- `PRIVATE_KEY`
- `WALLET_ADDRESS`
- `PANCAKESWAP_SUBGRAPH_URL`
- `CHAIN_ID`

Optional:

- `RPC_URL_ARB`
- `POLLING_INTERVAL_MS`
- `PORTFOLIO_API_PORT`
- `NEXUS_VAULT_ADDRESS`
- `SIGNAL_REGISTRY_ADDRESS`
- `AGENT_LEADERBOARD_ADDRESS`

## Security Notes

- Never commit real private keys.
- Keep execution on testnet while validating.
- Risk agent decisions are required before execution.
