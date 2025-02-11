import { ChainWalletAssets } from './walletAssetsModels'

export async function hydrateHoldingValues(assets: ChainWalletAssets[]) {
    for (const asset of assets) {
        const balance = Number(
            BigInt(asset.nativeAsset.balance) / BigInt(10 ** (asset.nativeAsset.decimals - 2)),
        )
        asset.nativeAsset.holdingValueCents = (asset.nativeAsset.priceCents * balance) / 100
        for (const token of asset.tokens) {
            const balance = Number(BigInt(token.balance) / BigInt(10 ** (token.decimals - 2)))
            token.holdingValueCents = (token.priceCents * balance) / 100
        }
    }
    return assets
}
