export function estimateGasCostUSD(gasPriceGwei: number, gasUnits: number = 200_000): number {
  const BNB_PRICE_USD = 300;
  const gasCostBNB = (gasPriceGwei * gasUnits) / 1e9;
  return gasCostBNB * BNB_PRICE_USD;
}

export function isTradeWorthGas(expectedProfitUSD: number, gasPriceGwei: number): boolean {
  const gasCost = estimateGasCostUSD(gasPriceGwei);
  return expectedProfitUSD > gasCost * 1.5;
}
