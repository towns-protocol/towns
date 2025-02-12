import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Box, Icon, Stack, Text } from '@ui'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { ChainWalletAssets, formatCents } from './tradingUtils'

const baseImageURL =
    'https://coin-images.coingecko.com/coins/images/31199/thumb/59302ba8-022e-45a4-8d00-e29fe2ee768c-removebg-preview.png?1696530026'
const solImageURL =
    'https://coin-images.coingecko.com/coins/images/4128/thumb/solana.png?1718769756'
export const TradingTokensList = ({ assets }: { assets: ChainWalletAssets[] }) => {
    const flattenedAssets = useMemo(() => {
        return assets
            .map((asset) => asset.tokens)
            .flat()
            .filter((token) => token.holdingValueCents > 1)
            .sort((a, b) => b.holdingValueCents - a.holdingValueCents)
    }, [assets])

    const baseNativeAsset = useMemo(() => {
        return assets.find((asset) => asset.chain === 'base')
    }, [assets])
    const solNativeAsset = useMemo(() => {
        return assets.find((asset) => asset.chain === 'solana-mainnet')
    }, [assets])

    return (
        <Stack gap>
            {baseNativeAsset && (
                <AssetEntry
                    asset={{
                        ...baseNativeAsset.nativeAsset,
                        imageUrl: baseImageURL,
                        decimals: 18,
                        tokenAddress: '',
                        symbol: 'BASE',
                        name: 'Base',
                        walletAddress: baseNativeAsset.walletAddress,
                        chain: 'base',
                    }}
                    key="base"
                />
            )}

            {solNativeAsset && (
                <AssetEntry
                    asset={{
                        ...solNativeAsset.nativeAsset,
                        imageUrl: solImageURL,
                        decimals: 9,
                        tokenAddress: '',
                        symbol: 'SOL',
                        name: 'Solana',
                        walletAddress: solNativeAsset.walletAddress,
                        chain: 'solana-mainnet',
                    }}
                    key="sol"
                />
            )}

            {flattenedAssets.map((token) => (
                <AssetEntry asset={token} key={token.tokenAddress} />
            ))}
        </Stack>
    )
}

const AssetEntry = ({
    asset,
}: {
    asset: {
        imageUrl?: string
        balance: string
        decimals: number
        tokenAddress: string
        name: string
        symbol: string
        holdingValueCents: number
        priceChange24h: number
        chain: string
        walletAddress?: string
    }
}) => {
    const pct = 1 + asset.priceChange24h / 100
    const value24hAgo = asset.holdingValueCents / pct
    const diff24h = asset.holdingValueCents - value24hAgo

    return (
        <Stack horizontal gap="md">
            {asset.imageUrl && asset.imageUrl !== 'missing.png' ? (
                <Box square="square_md" as="img" src={asset.imageUrl} rounded="full" />
            ) : (
                <Icon size="square_md" type="token" color="gray1" />
            )}
            <Stack gap="sm">
                <Stack horizontal gap="xs" alignItems="center">
                    <Text fontWeight="strong">{asset.name}</Text>
                    {asset.walletAddress && (
                        <WalletLinkOutButton
                            chain={asset.chain}
                            walletAddress={asset.walletAddress}
                        />
                    )}
                </Stack>

                <Text color="gray2">
                    {formatUnitsToFixedLength(BigInt(asset.balance), asset.decimals, 2)}{' '}
                    {asset.symbol}
                </Text>
            </Stack>

            <Box grow />

            <Stack gap="sm" alignItems="end">
                <Text fontWeight="strong">{formatCents(asset.holdingValueCents)}</Text>
                <Text color={asset.priceChange24h > 0 ? 'greenBlue' : 'error'}>
                    {formatCents(diff24h)}
                </Text>
            </Stack>
        </Stack>
    )
}

function formatWalletURL(walletAddress: string, chain: string) {
    if (chain === 'solana-mainnet') {
        return `https://solscan.io/account/${walletAddress}`
    } else if (chain === 'base') {
        return `https://basescan.org/address/${walletAddress}`
    } else {
        return ''
    }
}

export function WalletLinkOutButton({
    walletAddress,
    chain,
}: {
    walletAddress: string
    chain: string
}) {
    const url = formatWalletURL(walletAddress, chain)
    return (
        <Link
            style={{
                display: 'block',
                width: '100%',
            }}
            to={url}
            target="_blank"
            rel="noopenner noreferrer"
        >
            <Icon type="linkOut" />
        </Link>
    )
}
