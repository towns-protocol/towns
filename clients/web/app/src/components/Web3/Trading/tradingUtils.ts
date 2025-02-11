export function formatCents(cents: number): string {
    return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function calculateTotalHoldingValueCents(
    chainWalletAssets: ChainWalletAssets[] | undefined,
): number {
    if (!chainWalletAssets) {
        return 0
    }
    return chainWalletAssets.reduce((acc, chainWalletAsset) => {
        return (
            acc +
            chainWalletAsset.nativeAsset.holdingValueCents +
            chainWalletAsset.tokens.reduce((acc, token) => acc + token.holdingValueCents, 0)
        )
    }, 0)
}

export type TokenAsset = {
    chain: string
    tokenAddress: string
    symbol: string
    name: string
    balance: string
    decimals: number
    imageUrl: string
    priceCents: number // USD price from CoinGecko
    priceChange24h: number // 24h price change percentage from CoinGecko
    holdingValueCents: number
}

export type NativeAsset = {
    balance: string
    priceCents: number
    priceChange24h: number
    holdingValueCents: number
    imageUrl?: string
}

export type ChainWalletAssets = {
    chain: string // e.g., 'ethereum', 'polygon'
    coinGeckoIdentifier: string
    walletAddress: string
    nativeAsset: NativeAsset
    tokens: TokenAsset[]
}
