import { ChainWalletAssets } from './walletAssetsModels'

// this is a handful but we need this to reliably be able to calculate the holding value
// for tokens where either the quantity is super small or the price is super small
function holdingValueCents(balance: bigint, decimals: number, priceCents: number): number {
    // Convert priceCents to a string with full fixed-point precision.
    function toDecimalString(num: number): string {
        let str = num.toString()
        // this handles the annoying case where some junk token is priced at like
        // $0.0000000000123 and it gets converted to scientific notation like 1.23e-11
        if (str.includes('e')) {
            str = num.toFixed(50).replace(/\.?0+$/, '')
        }
        return str
    }

    const priceStr = toDecimalString(priceCents)
    // Split into whole and fractional parts,
    // default fractional part to empty string
    const [whole, fraction = ''] = priceStr.split('.')
    const priceScale = 10n ** BigInt(fraction.length)
    const priceInt = BigInt(whole + fraction)

    const tokenScale = 10n ** BigInt(decimals)
    const totalCents = (balance * priceInt) / (tokenScale * priceScale)

    return Number(totalCents)
}

export function hydrateHoldingValues(assets: ChainWalletAssets[]) {
    for (const asset of assets) {
        asset.nativeAsset.holdingValueCents = holdingValueCents(
            BigInt(asset.nativeAsset.balance),
            asset.nativeAsset.decimals,
            asset.nativeAsset.priceCents,
        )
        for (const token of asset.tokens) {
            token.holdingValueCents = holdingValueCents(
                BigInt(token.balance),
                token.decimals,
                token.priceCents,
            )
        }
    }
    return assets
}
