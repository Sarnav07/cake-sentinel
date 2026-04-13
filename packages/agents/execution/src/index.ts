import { orchestratorBus, publishError, MarketState, TradeEvent, TradeSignal } from '@pancakeswap-agent/core';
import { z } from 'zod';
import { estimateGasCostUSD } from './gas_estimator';
import { executeSwap } from './router';

const pendingSignals = new Map<string, TradeSignal>();
const pendingDecisions = new Map<string, { maxSlippageBps?: number; deadlineSeconds?: number }>();
let latestMarketState: MarketState | null = null;
let started = false;

const executionEnvSchema = z.object({
  WALLET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'WALLET_ADDRESS must be a valid address')
    .optional(),
});

const fallbackRecipient = '0x0000000000000000000000000000000000000000';

function isStableSymbol(symbol: string): boolean {
  return /usdt|usdc|busd|dai/i.test(symbol);
}

function estimateUsdPrice(symbol: string): number {
  if (isStableSymbol(symbol)) {
    return 1;
  }

  if (/bnb|wbnb/i.test(symbol)) {
    return 300;
  }

  if (/eth|weth/i.test(symbol)) {
    return 3000;
  }

  return 1;
}

function normalizeAmount(amountRaw: string, decimals: number): number {
  return Number(amountRaw) / Math.pow(10, decimals);
}

function quoteConstantProduct(amountIn: number, reserveIn: number, reserveOut: number): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return 0;
  }

  const amountInWithFee = amountIn * 997;
  return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
}

function getPoolFromMarketState(poolAddress: string): MarketState['pools'][string] | null {
  if (!latestMarketState) {
    return null;
  }

  return latestMarketState.pools[poolAddress] ?? null;
}

function getTradePair(pool: NonNullable<ReturnType<typeof getPoolFromMarketState>>): string {
  return `${pool.token0.symbol}/${pool.token1.symbol}`;
}

export function startExecutionAgent() {
  if (started) {
    return;
  }
  started = true;

  console.log('[Execution Agent] Listening for strategy:signal and risk:decision...');

  orchestratorBus.on('market:update', (state) => {
    latestMarketState = state;
  });

  orchestratorBus.on('strategy:signal', (signal) => {
    pendingSignals.set(signal.id, signal);
    setTimeout(() => pendingSignals.delete(signal.id), 30_000);

    const bufferedDecision = pendingDecisions.get(signal.id);
    if (bufferedDecision) {
      orchestratorBus.emit('risk:decision', {
        signalId: signal.id,
        approved: true,
        maxSlippageBps: bufferedDecision.maxSlippageBps,
        deadlineSeconds: bufferedDecision.deadlineSeconds,
      });
      pendingDecisions.delete(signal.id);
    }
  });

  orchestratorBus.on('risk:decision', async (decision) => {
    if (!decision.approved) {
      console.log(`[Execution Agent] Trade DENIED for signal ${decision.signalId}: ${decision.reason ?? 'No reason provided'}`);
      return;
    }

    const signal = pendingSignals.get(decision.signalId);
    if (!signal) {
      pendingDecisions.set(decision.signalId, {
        maxSlippageBps: decision.maxSlippageBps,
        deadlineSeconds: decision.deadlineSeconds,
      });
      return;
    }

    const pool = getPoolFromMarketState(signal.poolAddress);
    if (!pool) {
      publishError('ExecutionAgent', new Error(`Missing pool metadata for ${signal.poolAddress}`));
      return;
    }

    console.log(`[Execution Agent] Executing approved trade for signal ${signal.id}...`);

    try {
      const env = executionEnvSchema.parse({
        WALLET_ADDRESS: process.env.WALLET_ADDRESS,
      });

      const inputIsToken0 = signal.direction === 'buy'
        ? pool.token1.address.toLowerCase() === signal.targetToken.toLowerCase()
        : pool.token0.address.toLowerCase() === signal.targetToken.toLowerCase();

      const inputToken = signal.direction === 'buy'
        ? (inputIsToken0 ? pool.token0 : pool.token1)
        : (inputIsToken0 ? pool.token1 : pool.token0);
      const outputToken = inputToken.address.toLowerCase() === pool.token0.address.toLowerCase() ? pool.token1 : pool.token0;

      const inputUsdPrice = estimateUsdPrice(inputToken.symbol);
      const outputUsdPrice = estimateUsdPrice(outputToken.symbol);
      const amountInTokens = signal.sizeUSD / Math.max(inputUsdPrice, 0.0001);
      const reserve0 = normalizeAmount(pool.reserve0, pool.token0.decimals);
      const reserve1 = normalizeAmount(pool.reserve1, pool.token1.decimals);
      const reserveIn = inputToken.address.toLowerCase() === pool.token0.address.toLowerCase() ? reserve0 : reserve1;
      const reserveOut = inputToken.address.toLowerCase() === pool.token0.address.toLowerCase() ? reserve1 : reserve0;
      const quotedOutputTokens = quoteConstantProduct(amountInTokens, reserveIn, reserveOut);
      const quotedOutputUsd = quotedOutputTokens * outputUsdPrice;
      const slippageBps = decision.maxSlippageBps ?? 50;
      const amountOutMinimum = BigInt(Math.floor(quotedOutputTokens * (1 - slippageBps / 10_000) * Math.pow(10, outputToken.decimals)));
      const amountIn = BigInt(Math.floor(amountInTokens * Math.pow(10, inputToken.decimals)));
      const deadline = Math.floor(Date.now() / 1000) + (decision.deadlineSeconds ?? 60);

      const txHash = await executeSwap({
        tokenIn: inputToken.address,
        tokenOut: outputToken.address,
        fee: 2_500,
        deadline,
        amountIn,
        amountOutMinimum,
        recipient: env.WALLET_ADDRESS ?? fallbackRecipient,
      });

      const gasUsedUSD = estimateGasCostUSD(3.0);
      const grossProfitUSD = Math.max(signal.expectedProfitUSD, quotedOutputUsd - signal.sizeUSD, 0);
      const tradeEvent: TradeEvent = {
        txHash,
        signalId: signal.id,
        strategyId: signal.strategyId,
        poolAddress: signal.poolAddress,
        pair: getTradePair(pool),
        direction: signal.direction,
        sizeUSD: signal.sizeUSD,
        entryPrice: reserve0 > 0 && reserve1 > 0
          ? (inputToken.address.toLowerCase() === pool.token0.address.toLowerCase() ? reserve1 / reserve0 : reserve0 / reserve1)
          : 0,
        exitPrice: quotedOutputTokens > 0 ? quotedOutputUsd / Math.max(signal.sizeUSD, 0.0001) : 0,
        grossProfitUSD,
        feesUSD: gasUsedUSD,
        gasUsedUSD,
        netProfitUSD: grossProfitUSD - gasUsedUSD,
        regime: latestMarketState?.regime ?? 'unknown',
        timestamp: Date.now(),
      };

      console.log(
        `[Execution Agent] Trade executed! TxHash: ${txHash} | Net P&L: $${tradeEvent.netProfitUSD.toFixed(4)}`,
      );
      orchestratorBus.emit('execution:trade', tradeEvent);
      pendingSignals.delete(signal.id);
      pendingDecisions.delete(signal.id);
    } catch (err) {
      publishError('ExecutionAgent', err);
    }
  });
}

if (require.main === module) {
  startExecutionAgent();
}
