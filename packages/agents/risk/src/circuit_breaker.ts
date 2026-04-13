import { orchestratorBus } from '@pancakeswap-agent/core';
import { RiskPolicy } from './policies';

export class CircuitBreaker {
  private readonly policy: RiskPolicy;
  private peakEquityUSD = 0;
  private equityUSD = 0;
  private paused = false;
  private triggeredAt: number | null = null;

  constructor(policy: RiskPolicy) {
    this.policy = policy;
  }

  public updateEquity(equityUSD: number): number {
    this.equityUSD = equityUSD;
    if (equityUSD > this.peakEquityUSD) {
      this.peakEquityUSD = equityUSD;
    }
    return this.currentDrawdownPct;
  }

  public get currentDrawdownPct(): number {
    if (this.peakEquityUSD <= 0) {
      return 0;
    }
    return ((this.peakEquityUSD - this.equityUSD) / this.peakEquityUSD) * 100;
  }

  public get isPaused(): boolean {
    return this.paused;
  }

  public triggerBreaker(reason: string): void {
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.triggeredAt = Date.now();
    orchestratorBus.emit('risk:circuit_break', {
      triggeredAt: this.triggeredAt,
      drawdownPct: this.currentDrawdownPct,
      reason,
    });
  }

  public resetBreaker(): void {
    this.paused = false;
    this.triggeredAt = null;
  }

  public shouldTrigger(): boolean {
    return this.currentDrawdownPct > this.policy.maxDrawdownPct;
  }
}