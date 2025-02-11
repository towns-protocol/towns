import { Env } from '../../types'
import { hydrateWalletAssets } from './hydrateWalletAssets'
import { ChainWalletAssets, TokenAsset } from './walletAssetsModels'
import { Connection, PublicKey } from '@solana/web3.js'

// spl is the token program is we support
const SPL = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

export async function getSolanaWalletAssets(
    chainId: string,
    walletAddress: string,
    env: Env,
): Promise<ChainWalletAssets> {
    const API_KEY = env.ALCHEMY_API_KEY
    if (!API_KEY) {
        throw new Error('Missing ALCHEMY API key in environment variables.')
    }
    const rpcUrl = `https://${chainId}.g.alchemy.com/v2/${API_KEY}`
    const provider = new Connection(rpcUrl)
    const publicKey = new PublicKey(walletAddress)

    const accounts = await provider.getParsedTokenAccountsByOwner(publicKey, { programId: SPL })
    const assets = accounts.value
        .map((account) => {
            const token = account.account.data.parsed.info.mint
            if (typeof token === 'string') {
                return {
                    chain: chainId,
                    tokenAddress: token,
                    symbol: '',
                    name: '',
                    balance: account.account.data.parsed.info.tokenAmount.amount,
                    decimals: 0,
                    imageUrl: '',
                    priceCents: 0,
                    priceChange24h: 0,
                    holdingValueCents: 0,
                } satisfies TokenAsset
            }
            return undefined
        })
        .filter((asset) => !!asset)
        .map((asset) => asset as TokenAsset)
        .filter((asset) => asset.balance !== '0')

    const updatedAssets = await hydrateWalletAssets('solana', assets, env)
    const balance = await provider.getBalance(publicKey)

    return {
        chain: chainId,
        coinGeckoIdentifier: 'solana',
        walletAddress,
        nativeAsset: {
            balance: balance.toString(),
            priceCents: 0,
            priceChange24h: 0,
            holdingValueCents: 0,
            decimals: 9,
        },
        tokens: updatedAssets,
    }
}
