import { ChainWalletAssets } from './walletAssetsModels'
import { Env } from '../../types'

type CoinGeckoSimplePriceResponse = {
    [key: string]: {
        usd: number
        usd_24h_change: number
    }
}

export async function hydrateNativeTokenPrices(assets: ChainWalletAssets[], env: Env) {
    // the value of 1 eth on base == 1 eth, so let's just remap them here
    // since coingecko returns another price for base.
    // this will be 1:1 with the value displayed on Basescan
    function coinGeckoIdentifierToCoinId(identifier: string) {
        if (identifier === 'eth' || identifier === 'base') {
            return 'ethereum'
        }
        return identifier
    }

    const coinIds = assets.map((asset) => coinGeckoIdentifierToCoinId(asset.coinGeckoIdentifier))
    const API_KEY = env.COINGECKO_API_KEY
    if (!API_KEY) {
        throw new Error('Missing CoinGecko API key in environment variables.')
    }
    const url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&x_cg_pro_api_key=${API_KEY}`

    try {
        const response = await fetch(url)
        const priceData = (await response.json()) as CoinGeckoSimplePriceResponse
        for (const asset of assets) {
            const data = priceData[coinGeckoIdentifierToCoinId(asset.coinGeckoIdentifier)]
            if (data) {
                asset.nativeAsset.priceCents = 100 * data.usd
                asset.nativeAsset.priceChange24h = Number(data.usd_24h_change)
            }
        }
    } catch (error) {
        console.error('Error fetching CoinGecko native asset price:', error)
    }
}
