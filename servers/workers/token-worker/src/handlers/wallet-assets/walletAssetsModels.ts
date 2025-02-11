export type TokenAsset = {
    chain: string
    tokenAddress: string
    symbol: string
    name: string
    balance: string
    holdingValueCents: number
    decimals: number
    imageUrl: string
    priceCents: number // USD price from CoinGecko
    priceChange24h: number // 24h price change percentage from CoinGecko
}

export interface NativeAsset {
    balance: string
    priceCents: number
    priceChange24h: number
    holdingValueCents: number
    decimals: number
    imageUrl?: string
}

export interface ChainWalletAssets {
    chain: string // e.g., 'ethereum', 'polygon'
    coinGeckoIdentifier: string
    walletAddress: string
    nativeAsset: NativeAsset
    tokens: TokenAsset[]
}
