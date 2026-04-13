import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';
import { z } from 'zod';

export const PANCAKESWAP_V3_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export const PANCAKESWAP_V3_ROUTER_ADDRESS = '0x1b81D678ffb9C0263b24A97847620C99d213eB14';

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  deadline: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
}

const envSchema = z.object({
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'PRIVATE_KEY must be a 32-byte hex string prefixed with 0x'),
  RPC_URL_BSC: z.string().url('RPC_URL_BSC must be a valid URL'),
});

const swapParamsSchema = z.object({
  tokenIn: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'tokenIn must be a valid address'),
  tokenOut: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'tokenOut must be a valid address'),
  fee: z.number().int().min(1).max(1_000_000),
  amountIn: z.bigint().positive(),
  amountOutMinimum: z.bigint().nonnegative(),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'recipient must be a valid address'),
  deadline: z.number().int().positive(),
});

export async function executeSwap(params: SwapParams): Promise<string> {
  try {
    const env = envSchema.parse({
      PRIVATE_KEY: process.env.PRIVATE_KEY,
      RPC_URL_BSC: process.env.RPC_URL_BSC,
    });

    const parsedParams = swapParamsSchema.parse(params);
    const account = privateKeyToAccount(env.PRIVATE_KEY as `0x${string}`);

    const transport = http(env.RPC_URL_BSC);
    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport,
    });

    const walletClient = createWalletClient({
      account,
      chain: bscTestnet,
      transport,
    });

    await publicClient.getChainId();

    const txHash = await walletClient.writeContract({
      account,
      chain: bscTestnet,
      address: PANCAKESWAP_V3_ROUTER_ADDRESS as `0x${string}`,
      abi: PANCAKESWAP_V3_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: parsedParams.tokenIn as `0x${string}`,
          tokenOut: parsedParams.tokenOut as `0x${string}`,
          fee: parsedParams.fee,
          recipient: parsedParams.recipient as `0x${string}`,
            deadline: BigInt(parsedParams.deadline),
          amountIn: parsedParams.amountIn,
          amountOutMinimum: parsedParams.amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    console.log(`[Execution Router] Swap submitted. txHash=${txHash}`);
    return txHash;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[Execution Router] Failed to execute swap: ${message}`);
  }
}
