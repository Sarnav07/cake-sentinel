import { EventEmitter } from 'events';
import { MarketState, TradeSignal, RiskDecision, TradeEvent } from './types';
export interface AgentEvents {
    'market:update': (state: MarketState) => void;
    'strategy:signal': (signal: TradeSignal) => void;
    'risk:decision': (decision: RiskDecision) => void;
    'execution:trade': (trade: TradeEvent) => void;
    'error': (error: Error) => void;
}
declare class TypedEventEmitter extends EventEmitter {
    emit<K extends keyof AgentEvents>(event: K, ...args: Parameters<AgentEvents[K]>): boolean;
    on<K extends keyof AgentEvents>(event: K, listener: AgentEvents[K]): this;
    once<K extends keyof AgentEvents>(event: K, listener: AgentEvents[K]): this;
}
export declare const orchestratorBus: TypedEventEmitter;
export declare const publishError: (source: string, error: unknown) => void;
export {};
