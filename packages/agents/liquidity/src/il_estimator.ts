/**
 * Calculates Impermanent Loss (IL) for a classical V2 AMM (constant product formula x * y = k).
 * 
 * IL = 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
 * 
 * @param initialPrice The entry price of token X in terms of token Y
 * @param currentPrice The current price of token X in terms of token Y
 * @returns The impermanent loss as a negative decimal (e.g. -0.057 for 5.7% IL)
 */
export function calculateV2ImpermanentLoss(initialPrice: number, currentPrice: number): number {
  if (initialPrice <= 0 || currentPrice <= 0) {
    throw new Error('Prices must be strictly positive');
  }

  const priceRatio = currentPrice / initialPrice; // k
  
  // IL Formula: 2 * sqrt(k) / (1 + k) - 1
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return il;
}

/**
 * Calculates a basic approximation of Impermanent Loss in concentrated liquidity (V3 AMM).
 * V3 IL is highly dependent on the bounds [Pa, Pb]. This is a simplified function
 * to measure capital loss relative to holding, assuming the current price is within bounds.
 * 
 * @param initialPrice 
 * @param currentPrice 
 * @param lowerBound The lower price bound of the concentrated position
 * @param upperBound The upper price bound of the concentrated position
 * @returns Approximate Impermanent loss
 */
export function calculateV3ImpermanentLossApprox(
  initialPrice: number, 
  currentPrice: number, 
  lowerBound: number, 
  upperBound: number
): number {
  const sqrtP0 = Math.sqrt(initialPrice);
  const sqrtPt = Math.sqrt(currentPrice);
  const sqrtPa = Math.sqrt(lowerBound);
  const sqrtPb = Math.sqrt(upperBound);

  // If price leaves the active tick range entirely, the position suffers 
  // 100% of the possible IL bounded at that tick limit. 
  // For a basic V3 heuristic, we scale V2 IL by the leverage factor of the tight bounds.
  // We'll calculate the value of the LP vs holding the original 50/50 portfolio.
  
  // To prevent complex integration logic, we can return the V2 IL amplified by leverage.
  // Leverage factor L ≈ 1 / (1 - sqrt(Pa/P0)).
  
  const v2IL = calculateV2ImpermanentLoss(initialPrice, currentPrice);
  const leverageFactor = 1 / (1 - Math.sqrt(lowerBound / initialPrice));
  
  const estimatedV3IL = v2IL * leverageFactor;
  
  // In reality, V3 IL can't exceed 100% loss of capital relative to holding
  return Math.max(-1.0, estimatedV3IL);
}
