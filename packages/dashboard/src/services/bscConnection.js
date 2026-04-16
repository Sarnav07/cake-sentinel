import { ethers } from 'ethers'

const RPC_PRIMARY   = 'https://data-seed-prebsc-1-s1.binance.org:8545/'
const RPC_BACKUP    = 'https://data-seed-prebsc-2-s1.binance.org:8545/'
const ROUTER_V2     = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
const WBNB          = '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'
const BUSD          = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
const BNB_BUSD_PAIR = '0xe0e92035077c39594793e61802a350347c320cf2'

const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
]
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'
]

let _provider = null
let _bnbPriceCache = { value: null, ts: 0 }

export async function getProvider() {
  if (_provider) return _provider
  try {
    _provider = new ethers.JsonRpcProvider(RPC_PRIMARY)
    await _provider.getBlockNumber()
    console.log('✓ Connected to BSC Testnet (Chain ID: 97)')
    return _provider
  } catch {
    console.warn('Primary RPC failed, trying backup...')
    _provider = new ethers.JsonRpcProvider(RPC_BACKUP)
    return _provider
  }
}

export async function getBNBPrice() {
  // Return cached value if under 3 seconds old
  if (_bnbPriceCache.value && Date.now() - _bnbPriceCache.ts < 3000) {
    return _bnbPriceCache.value
  }
  try {
    const provider = await getProvider()
    const router = new ethers.Contract(ROUTER_V2, ROUTER_ABI, provider)
    const amounts = await router.getAmountsOut(
      ethers.parseEther('1'),
      [WBNB, BUSD]
    )
    const price = parseFloat(ethers.formatEther(amounts[1]))
    _bnbPriceCache = { value: price, ts: Date.now() }
    // Persist fallback to localStorage
    localStorage.setItem('nexus_bnb_price', price.toString())
    return price
  } catch (e) {
    console.warn('getBNBPrice RPC failed, using fallback:', e.message)
    const stored = localStorage.getItem('nexus_bnb_price')
    return stored ? parseFloat(stored) : 312.40
  }
}

export async function getPoolReserves() {
  try {
    const provider = await getProvider()
    const pair = new ethers.Contract(BNB_BUSD_PAIR, PAIR_ABI, provider)
    const [r0, r1] = await pair.getReserves()
    const reserve0 = parseFloat(ethers.formatEther(r0))
    const reserve1 = parseFloat(ethers.formatEther(r1))
    return { 
      reserve0, 
      reserve1, 
      ratio: reserve0 / reserve1,
      imbalance: Math.abs(1 - (reserve0 / reserve1)) * 100
    }
  } catch (e) {
    console.warn('getPoolReserves failed:', e.message)
    return { reserve0: 0, reserve1: 0, ratio: 1, imbalance: 0.3 }
  }
}

export async function getGasPrice() {
  try {
    const provider = await getProvider()
    const feeData = await provider.getFeeData()
    const gwei = parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'))
    return { gwei: parseFloat(gwei.toFixed(2)) }
  } catch {
    return { gwei: 3.5 }
  }
}
