import { orchestratorBus, publishError, TradeEvent, TradeSignal } from '@pancakeswap-agent/core';
import { z } from 'zod';
import { estimateGasCostUSD } from './gas_estimator';
import { executeSwap } from './router';

const pendingSignals = new Map<string, TradeSignal>();

const executionEnvSchema = z.object({
  WALLET_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'WALLET_ADDRESS must be a valid address')
    .optional(),
});

const fallbackRecipient = '0x0000000000000000000000000000000000000000';

export function startExecutionAgent() {
  console.log('[Execution Agent] Listening for strategy:signal and risk:decision...');

  orchestratorBus.on('strategy:signal', (signal) => {
    pendingSignals.set(signal.id, signal);
    setTimeout(() => pendingSignals.delete(signal.id), 30_000);
  });

  orchestratorBus.on('risk:decision', async (decision) => {
    if (!decision.approved) {
      console.log(`[Execution Agent] Trade DENIED for signal ${decision.signalId}: ${decision.reason ?? 'No reason provided'}`);
      return;
    }

    const signal = pendingSignals.get(decision.signalId);
    if (!signal) {
      console.warn(`[Execution Agent] No cached signal for id ${decision.signalId}`);
      return;
    }

    console.log(`[Execution Agent] Executing approved trade for signal ${signal.id}...`);

    try {
      const env = executionEnvSchema.parse({
        WALLET_ADDRESS: process.env.WALLET_ADDRESS,
      });

      const amountIn = BigInt(Math.floor((signal.sizeUSD * 1e18) / 300));
      const slippageBps = decision.maxSlippageBps ?? 50;
      const amountOutMinimum = (amountIn * BigInt(10_000 - slippageBps)) / 10_000n;
      const deadline = Math.floor(Date.now() / 1000) + (decision.deadlineSeconds ?? 60);

      const txHash = await executeSwap({
        tokenIn: signal.direction === 'buy' ? signal.poolAddress : signal.targetToken,
        tokenOut: signal.direction === 'buy' ? signal.targetToken : signal.poolAddress,
        fee: 2_500,
        amountIn,
        amountOutMinimum,
        recipient: env.WALLET_ADDRESS ?? fallbackRecipient,
        deadline,
      });

      const gasUsedUSD = estimateGasCostUSD(3.0);
      const tradeEvent: TradeEvent = {
        txHash,
        signalId: signal.id,
        poolAddress: signal.poolAddress,
        direction: signal.direction,
        sizeUSD: signal.sizeUSD,
        entryPrice: signal.expectedProfitUSD / signal.sizeUSD,
        gasUsedUSD,
        netProfitUSD: signal.expectedProfitUSD - gasUsedUSD,
        timestamp: Date.now(),
      };

      console.log(
        `[Execution Agent] Trade executed! TxHash: ${txHash} | Net P&L: $${tradeEvent.netProfitUSD.toFixed(4)}`,
      );
      orchestratorBus.emit('execution:trade', tradeEvent);
      pendingSignals.delete(signal.id);
    } catch (err) {
      publishError('ExecutionAgent', err);
    }
  });
}

if (require.main === module) {
  startExecutionAgent();
}
