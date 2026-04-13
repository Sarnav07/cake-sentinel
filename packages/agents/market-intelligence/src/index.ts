import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';
import { request, gql } from 'graphql-request';
import { z } from 'zod';
import { orchestratorBus, publishError, MarketState, PoolData } from '@pancakeswap-agent/core';
import { detectRegime } from './regime_detector';
import { BSC_TESTNET_POOLS, TrackedPool } from './pool_mapper';

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

const TARGET_POOLS: TrackedPool[] = BSC_TESTNET_POOLS;
const regimePriceHistory: number[] = [];

const TOKEN_METADATA: Record<string, { symbol: string; decimals: number }> = {
  '0xae13d989dac2f0debff460ac112a837c89baa7cd': { symbol: 'WBNB', decimals: 18 },
  '0x78867bbeef44f2326bf8ddd1941a4439382ef2a7': { symbol: 'BUSD', decimals: 18 },
  '0xfa60d973f7642b748046464e165a65b7323b0ebe': { symbol: 'CAKE', decimals: 18 },
};

function getTokenMeta(address: string): { symbol: string; decimals: number } {
  return TOKEN_METADATA[address.toLowerCase()] ?? {
    symbol: `${address.slice(0, 6)}...${address.slice(-4)}`,
    decimals: 18,
  };
}

const V2_PAIR_ABI = [
  {
    type: 'function',
    name: 'getReserves',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
] as const;

const V3_POOL_ABI = [
  {
    type: 'function',
    name: 'slot0',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'liquidity',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }],
  },
] as const;

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

async function fetchPoolsFromSubgraph(): Promise<SubgraphPool[] | null> {
  try {
    const variables = { poolAddresses: TARGET_POOLS.map((pool) => pool.address) };
    const data = await request<SubgraphResponse>(env.PANCAKESWAP_SUBGRAPH_URL, POOLS_QUERY, variables);
    return data.pools;
  } catch {
    return null;
  }
}

async function buildFallbackPoolsFromOnchain(): Promise<SubgraphPool[]> {
  const fallbackPools: SubgraphPool[] = [];

  for (const trackedPool of TARGET_POOLS) {
    const token0 = getTokenMeta(trackedPool.tokens[0]);
    const token1 = getTokenMeta(trackedPool.tokens[1]);
    const reserves = await fetchOnchainReserves(trackedPool);

    fallbackPools.push({
      id: trackedPool.address,
      feeTier: String(trackedPool.feeTierBps),
      liquidity: reserves.reserve0,
      volumeUSD: '0',
      token0: {
        id: trackedPool.tokens[0],
        symbol: token0.symbol,
        decimals: String(token0.decimals),
      },
      token1: {
        id: trackedPool.tokens[1],
        symbol: token1.symbol,
        decimals: String(token1.decimals),
      },
    });
  }

  return fallbackPools;
}

async function fetchOnchainReserves(pool: TrackedPool): Promise<{ reserve0: string; reserve1: string }> {
  if (pool.ammVersion === 'v2') {
    const reserves = await publicClient.readContract({
      address: pool.address as `0x${string}`,
      abi: V2_PAIR_ABI,
      functionName: 'getReserves',
    }) as unknown as readonly [bigint, bigint, number];
    const [reserve0, reserve1] = reserves;

    return {
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
    };
  }

  const [slot0Result, liquidityResult] = await Promise.all([
    publicClient.readContract({
      address: pool.address as `0x${string}`,
      abi: V3_POOL_ABI,
      functionName: 'slot0',
    }),
    publicClient.readContract({
      address: pool.address as `0x${string}`,
      abi: V3_POOL_ABI,
      functionName: 'liquidity',
    }),
  ]) as unknown as [readonly [bigint, number, number, number, number, number, boolean], bigint];

  const [sqrtPriceX96] = slot0Result;
  const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
  const price = sqrtPrice * sqrtPrice;
  const liquidityNumber = Number(liquidityResult);
  const reserve0 = liquidityNumber / Math.max(price, 1e-9);
  const reserve1 = liquidityNumber * Math.max(price, 1e-9);

  return {
    reserve0: reserve0.toFixed(6),
    reserve1: reserve1.toFixed(6),
  };
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

      // 2. Fetch pool metadata from subgraph, fall back to on-chain sources when unavailable.
      const subgraphPools = await fetchPoolsFromSubgraph();
      const pools = subgraphPools ?? await buildFallbackPoolsFromOnchain();

      // 3. Format Data into Shared Core Interface
      const poolsRecord: Record<string, PoolData> = {};
      
      for (const p of pools) {
        const trackedPool = TARGET_POOLS.find((pool) => pool.address.toLowerCase() === p.id.toLowerCase());
        const onchainReserves = trackedPool ? await fetchOnchainReserves(trackedPool) : { reserve0: '1', reserve1: '1' };

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
          reserve0: onchainReserves.reserve0,
          reserve1: onchainReserves.reserve1,
          feeTier: Number(p.feeTier),
          liquidity: p.liquidity,
          volumeUSD: p.volumeUSD,
        };
      }

      // 4. Construct MarketState
      const poolPrices = Object.values(poolsRecord)
        .map((pool) => Number(pool.reserve1) / Math.max(Number(pool.reserve0), 1e-9))
        .filter((value) => Number.isFinite(value) && value > 0);
      const blendedPrice = poolPrices.length > 0
        ? poolPrices.reduce((sum, value) => sum + value, 0) / poolPrices.length
        : gasPriceGwei;
      regimePriceHistory.push(blendedPrice);
      if (regimePriceHistory.length > 30) {
        regimePriceHistory.shift();
      }
      const currentRegime = regimePriceHistory.length >= 5 ? detectRegime(regimePriceHistory) : 'unknown';

      const state: MarketState = {
        timestamp: Date.now(),
        pools: poolsRecord,
        regime: currentRegime,
        gasPriceGwei,
      };

      // 5. Publish to Orchestrator
      orchestratorBus.emit('market:update', state);
      console.log(`[Market Intelligence] Emitted MarketState updates for ${pools.length} pools. Gas: ${gasPriceGwei.toFixed(2)} gwei`);

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
