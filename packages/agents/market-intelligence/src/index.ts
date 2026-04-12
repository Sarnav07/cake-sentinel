import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';
import { request, gql } from 'graphql-request';
import { z } from 'zod';
import { orchestratorBus, publishError, MarketState, PoolData } from '@pancakeswap-agent/core';
import { detectRegime } from './regime_detector';

// Strict Environment Configuration using Zod
const envSchema = z.object({
  RPC_URL_BSC: z.string().url(),
  PANCAKESWAP_SUBGRAPH_URL: z.string().url(),
  POLLING_INTERVAL_MS: z.coerce.number().default(5000),
});

const env = envSchema.parse({
  RPC_URL_BSC: process.env.RPC_URL_BSC || 'https://data-seed-prebsc-1-s1.binance.org:8545',
  PANCAKESWAP_SUBGRAPH_URL: process.env.PANCAKESWAP_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
  POLLING_INTERVAL_MS: process.env.POLLING_INTERVAL_MS || 5000,
});

// Setup viem client for on-chain reads
const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(env.RPC_URL_BSC),
});

// Target the most liquid pools for tracking
const TARGET_POOLS = [
  '0x36696169c63e42cd08ce11f5dee83f8829aa8a73', // Example Testnet Pool
];

const POOLS_QUERY = gql`
  query GetPools($poolAddresses: [String!]) {
    pools(where: { id_in: $poolAddresses }) {
      id
      feeTier
      liquidity
      volumeUSD
      token0 {
        id
        symbol
        decimals
      }
      token1 {
        id
        symbol
        decimals
      }
    }
  }
`;

interface SubgraphPool {
  id: string;
  feeTier: string;
  liquidity: string;
  volumeUSD: string;
  token0: { id: string; symbol: string; decimals: string };
  token1: { id: string; symbol: string; decimals: string };
}

interface SubgraphResponse {
  pools: SubgraphPool[];
}

/**
 * Market Intelligence Agent Loop
 */
async function runMarketIntelligence() {
  console.log('[Market Intelligence Agent] Starting data loop...');

  setInterval(async () => {
    try {
      // 1. Fetch Gas Price from viem
      const gasPrice = await publicClient.getGasPrice();
      const gasPriceGwei = Number(gasPrice) / 1e9;

      // 2. Fetch Pool Data from Subgraph
      const variables = { poolAddresses: TARGET_POOLS };
      const data = await request<SubgraphResponse>(env.PANCAKESWAP_SUBGRAPH_URL, POOLS_QUERY, variables);

      // 3. Format Data into Shared Core Interface
      const poolsRecord: Record<string, PoolData> = {};
      
      for (const p of data.pools) {
        poolsRecord[p.id] = {
          address: p.id,
          token0: {
            address: p.token0.id,
            symbol: p.token0.symbol,
            decimals: Number(p.token0.decimals),
          },
          token1: {
            address: p.token1.id,
            symbol: p.token1.symbol,
            decimals: Number(p.token1.decimals),
          },
          // Mock reserves for simplicity assuming we'd fetch them via RPC directly if precise reserves are needed
          reserve0: "0",
          reserve1: "0",
          feeTier: Number(p.feeTier),
          liquidity: p.liquidity,
          volumeUSD: p.volumeUSD,
        };
      }

      // 4. Construct MarketState
      const regimeArray = [gasPriceGwei, gasPriceGwei*1.1, gasPriceGwei*0.9, gasPriceGwei, gasPriceGwei*1.1]; // Mock price feed for demo
      const currentRegime = detectRegime(regimeArray);

      const state: MarketState = {
        timestamp: Date.now(),
        pools: poolsRecord,
        regime: currentRegime,
        gasPriceGwei,
      };

      // 5. Publish to Orchestrator
      orchestratorBus.emit('market:update', state);
      console.log(`[Market Intelligence] Emitted MarketState updates for ${data.pools.length} pools. Gas: ${gasPriceGwei.toFixed(2)} gwei`);

    } catch (error) {
      publishError('MarketIntelligence', error);
    }
  }, env.POLLING_INTERVAL_MS);
}

// Start Agent if executed directly
if (require.main === module) {
  runMarketIntelligence().catch(error => {
    console.error('Fatal agent crash:', error);
    process.exit(1);
  });
}

export { runMarketIntelligence };
