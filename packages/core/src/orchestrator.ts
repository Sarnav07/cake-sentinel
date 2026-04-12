import { EventEmitter } from 'events';
import { MarketState, TradeSignal, RiskDecision, TradeEvent } from './types';

// Define the strict event map
export interface AgentEvents {
  'market:update': (state: MarketState) => void;
  'strategy:signal': (signal: TradeSignal) => void;
  'risk:decision': (decision: RiskDecision) => void;
  'execution:trade': (trade: TradeEvent) => void;
  'error': (error: Error) => void;
}

// Strictly typed EventEmitter
class TypedEventEmitter extends EventEmitter {
  public emit<K extends keyof AgentEvents>(event: K, ...args: Parameters<AgentEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  public on<K extends keyof AgentEvents>(event: K, listener: AgentEvents[K]): this {
    return super.on(event, listener);
  }

  public once<K extends keyof AgentEvents>(event: K, listener: AgentEvents[K]): this {
    return super.once(event, listener);
  }
}

export const orchestratorBus = new TypedEventEmitter();

// Prevent Node.js from crashing if an error is emitted before agents attach listeners
orchestratorBus.on('error', (err) => {
  console.error('[Orchestrator Defaults] Unhandled Agent Error:', err.message);
});

// Utility for agents to publish errors safely
export const publishError = (source: string, error: unknown) => {
  const e = error instanceof Error ? error : new Error(String(error));
  e.message = `[${source}] ${e.message}`;
  orchestratorBus.emit('error', e);
};
