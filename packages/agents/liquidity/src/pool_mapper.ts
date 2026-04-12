/**
 * A central directory mapped for the Market Intelligence Agent
 * to know exactly which pools to poll and how to route them.
 */

export interface TrackedPool {
  address: string;
  ammVersion: 'v2' | 'v3';
  tokens: [string, string];
  feeTierBps: number;
}

// Hardcoded Pool Maps for BSC Testnet
export const BSC_TESTNET_POOLS: TrackedPool[] = [
  {
    // Mock BNB/BUSD V3 Pool address on Testnet
    address: '0x36696169c63e42cd08ce11f5dee83f8829aa8a73',
    ammVersion: 'v3',
    tokens: [
      '0xae13d989dac2f0debff460ac112a837c89baa7cd', // WBNB
      '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7'  // BUSD
    ],
    feeTierBps: 2500 // 0.25%
  },
  {
    // Mock CAKE/WBNB V2 Pool address on Testnet
    address: '0x99245fc24c0dcd1cecd0db04b31175de5599d146',
    ammVersion: 'v2',
    tokens: [
      '0xfa60d973f7642b748046464e165a65b7323b0ebe', // CAKE
      '0xae13d989dac2f0debff460ac112a837c89baa7cd'  // WBNB
    ],
    feeTierBps: 2500 
  }
];

export function getTrackedPoolAddresses(chainId: number): string[] {
  if (chainId === 97) {
    return BSC_TESTNET_POOLS.map(p => p.address);
  }
  return []; // Fallback for unsupported chains
}
