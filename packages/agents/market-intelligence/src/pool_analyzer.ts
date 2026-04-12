import { PoolData } from '@pancakeswap-agent/core';

export type RiskTier = 'blue_chip' | 'mid_cap' | 'degen';

/**
 * Categorizes a liquidity pool's risk profile based on depth and volume.
 * 
 * @param pool The shared PoolData object 
 */
export function categorizePoolRisk(pool: PoolData): RiskTier {
  // Convert GraphQL string data into numbers
  // Note: Actual thresholds rely heavily on correct decimal normalization.
  const tvlUSD = parseFloat(pool.liquidity); 
  const volumeUSD = parseFloat(pool.volumeUSD);

  // Example Thresholds for categorization
  const BLUE_CHIP_TVL_MIN = 5_000_000;
  const MID_CAP_TVL_MIN = 500_000;

  // Blue-chip tokens have deep liquidity, making them harder to manipulate
  if (tvlUSD > BLUE_CHIP_TVL_MIN) {
    return 'blue_chip';
  } 
  
  // Mid-cap tokens are solid but still susceptible to medium-sized whale slippage
  else if (tvlUSD > MID_CAP_TVL_MIN) {
    return 'mid_cap';
  } 
  
  // Degen / Low Liquidity tokens. Extreme volatility risk. Single trades impact price heavily.
  else {
    return 'degen';
  }
}
