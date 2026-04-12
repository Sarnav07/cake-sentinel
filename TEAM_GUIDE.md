# Development Handover: Person 2 & Person 3

Welcome! Person 1 has completed the foundational data pipeline (Market Intelligence Agent & Liquidity Estimations). The core infrastructure is live. This document outlines exactly where you should start.

## The Most Important Thing to Know

We are using an **Orchestrator** (`packages/core/src/orchestrator.ts`) as our communication bus. 
**No agent calls another agent directly.** We strictly use typed events.
Before you write any code, look at `packages/core/src/types.ts`. Your data payloads must match these interfaces exactly.

---

## Instructions for Person 2 (Strategy & Execution)

Your job is to read the `MarketState` being emitted by Person 1 every 5 seconds, run arbitrage math on it, and execute swaps on PancakeSwap.

**Where to start:**
1. Open `packages/agents/strategy/`. Create an `index.ts`.
2. Import the orchestrator: `import { orchestratorBus } from '@pancakeswap-agent/core';`
3. Listen for the `market:update` event:
   ```typescript
   orchestratorBus.on('market:update', (state) => {
      // 1. Loop through state.pools
      // 2. Identify if there is a > 0.5% price discrepancy between pools
      // 3. Emit a TradeSignal back to the bus
      orchestratorBus.emit('strategy:signal', myTradeSignal);
   });
   ```
4. Build `packages/agents/execution/`. Listen for `risk:decision`. If `decision.approved` is true, use `viem` to submit a `swapExactTokensForTokens` transaction to the PancakeSwap V3 Router on BSC Testnet.

### Person 2 Status Update

Person 2 implementation is complete and committed in:

- `packages/agents/strategy/`
   - `src/arbitrage_detector.ts`
   - `src/signal_builder.ts`
   - `src/index.ts`

- `packages/agents/execution/`
   - `src/router.ts`
   - `src/gas_estimator.ts`
   - `src/index.ts`

Execution flow now implemented:

1. `market:update` -> Strategy agent computes cross-pool opportunities and emits one `strategy:signal`.
2. `risk:decision` -> Execution agent executes approved signals through PancakeSwap V3 router.
3. Execution agent emits `execution:trade` with tx hash and P&L fields.

Notes for Person 3 integration:

- You can now consume `strategy:signal` and emit `risk:decision` directly without additional Person 2 changes.
- Use `signal.id` as the join key across your risk logs and downstream UI metrics.
- If you deny a signal, include `reason` to improve observability in execution logs.

Recommended local run order for Person 3 integration testing:

1. Start Market Intelligence: `npm run start --workspace=@pancakeswap-agent/market-intelligence`
2. Start Strategy Agent: `npm run start --workspace=@pancakeswap-agent/strategy`
3. Start Risk Agent (Person 3): emit `risk:decision` for incoming `strategy:signal`
4. Start Execution Agent: `npm run start --workspace=@pancakeswap-agent/execution`
5. Subscribe dashboard/backend to `execution:trade` for real-time P&L views

---

## Instructions for Person 3 (Risk & Dashboard)

Your job is to act as the firewall (approving/denying trades) and the bookkeeper (P&L and UI).

**Where to start:**
1. Open `packages/agents/risk/`. Create an `index.ts`.
2. Listen for Person 2's signals: `orchestratorBus.on('strategy:signal', (signal) => { ... })`
3. Write your circuit-breaker logic:
   - *Is `signal.sizeUSD` greater than $500? Deny.*
   - *Is `signal.expectedProfitUSD` less than estimated gas costs? Deny.*
4. If it passes, emit:
   ```typescript
   orchestratorBus.emit('risk:decision', { 
       signalId: signal.id, 
       approved: true, 
       maxSlippageBps: 50 
   });
   ```
5. **For the Dashboard:** Spin up a new React app inside `packages/dashboard/`. You can use WebSockets or just a lightweight local Express server in the core package to stream the 'execution:trade' events to your UI so judges can see our live P&L chart!
