import { describe, expect, it } from 'vitest';
import { CircuitBreaker } from './circuit_breaker';
import { DEFAULT_POLICY } from './policies';

describe('CircuitBreaker', () => {
  it('updates drawdown from equity curve', () => {
    const breaker = new CircuitBreaker(DEFAULT_POLICY);
    breaker.updateEquity(1000);
    breaker.updateEquity(900);
    expect(breaker.currentDrawdownPct).toBeCloseTo(10, 1);
  });

  it('triggers and resets', () => {
    const breaker = new CircuitBreaker(DEFAULT_POLICY);
    breaker.updateEquity(1000);
    breaker.updateEquity(850);
    breaker.triggerBreaker('test');
    expect(breaker.isPaused).toBe(true);
    breaker.resetBreaker();
    expect(breaker.isPaused).toBe(false);
  });
});