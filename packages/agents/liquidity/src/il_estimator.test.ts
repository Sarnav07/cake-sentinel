import { describe, expect, it } from 'vitest';
import { calculateV2ImpermanentLoss, calculateV3ImpermanentLossApprox } from './il_estimator';

describe('impermanent loss estimator', () => {
  it('returns zero IL when prices are unchanged', () => {
    expect(calculateV2ImpermanentLoss(1, 1)).toBeCloseTo(0, 8);
  });

  it('returns negative IL for price moves', () => {
    expect(calculateV2ImpermanentLoss(1, 2)).toBeLessThan(0);
  });

  it('approximates v3 IL and clamps at -100%', () => {
    const il = calculateV3ImpermanentLossApprox(1, 10, 0.8, 1.2);
    expect(il).toBeLessThanOrEqual(0);
    expect(il).toBeGreaterThanOrEqual(-1);
  });
});