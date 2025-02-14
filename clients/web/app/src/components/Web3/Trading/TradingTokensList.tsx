import React, { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Box, Icon, Stack, Text } from '@ui'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { notUndefined } from 'ui/utils/utils'
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
        const asset = assets.find((asset) => asset.chain === 'base')
        if (!asset) {
            return
        }
        return {
            ...asset.nativeAsset,
            imageUrl: baseImageURL,
            decimals: 18,
            tokenAddress: 'BASE',
            symbol: 'BASE',
            name: 'Base',
            walletAddress: asset.walletAddress,
            chain: 'base',
        } as const
    }, [assets])

    const solNativeAsset = useMemo(() => {
        const asset = assets.find((asset) => asset.chain === 'solana-mainnet')
        if (!asset) {
            return
        }
        return {
            ...asset.nativeAsset,
            imageUrl: solImageURL,
            decimals: 9,
            tokenAddress: '',
            symbol: 'SOL',
            name: 'Solana',
            walletAddress: asset.walletAddress,
            chain: 'solana-mainnet',
        } as const
    }, [assets])

    const allAssets = useMemo(() => {
        return [baseNativeAsset, solNativeAsset, ...flattenedAssets].filter(notUndefined)
    }, [baseNativeAsset, solNativeAsset, flattenedAssets])

    return (
        <>
            {allAssets.map((token) => (
                <AssetEntry asset={token} key={token.tokenAddress} />
            ))}
        </>
    )
}

type AssetData = {
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

const AssetEntry = ({ asset }: { asset: AssetData }) => {
    const pct = 1 + asset.priceChange24h / 100
    const value24hAgo = asset.holdingValueCents / pct
    const diff24h = asset.holdingValueCents - value24hAgo

    const { openPanel } = usePanelActions()
    const onClick = useCallback(() => {
        if (asset.tokenAddress) {
            openPanel('trade', {
                mode: 'sell',
                tokenAddress: asset.tokenAddress,
                chainId:
                    asset.chain === 'solana-mainnet'
                        ? '1151111081099710'
                        : asset.chain === 'base'
                        ? '8453'
                        : '1',
            })
        }
    }, [asset, openPanel])

    return (
        <Stack
            horizontal
            hoverable
            paddingX="md"
            gap="md"
            background="level1"
            rounded="sm"
            inset="xs"
            height="x7"
            cursor="pointer"
            onClick={onClick}
        >
            <Box centerContent>
                <TokenIcon asset={asset} />
            </Box>
            <Stack gap="sm" justifyContent="center">
                <Stack horizontal gap="xs" alignItems="center">
                    <Text fontWeight="strong">{asset.name}</Text>
                </Stack>

                <Text color="gray2" fontSize="sm">
                    {formatUnitsToFixedLength(BigInt(asset.balance), asset.decimals, 2)}{' '}
                    {asset.symbol}
                </Text>
            </Stack>

            <Box grow />

            <Stack gap="sm" alignItems="end" justifyContent="center">
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

function TokenIcon(props: { asset: AssetData }) {
    const { asset } = props
    return asset.imageUrl && asset.imageUrl !== 'missing.png' ? (
        <Box position="relative">
            <Box square="square_lg" as="img" src={asset.imageUrl} rounded="full" />
            {['solana-mainnet', 'base'].includes(asset.chain) && (
                <Box
                    centerContent
                    position="bottomRight"
                    square="square_xs"
                    background={asset.chain === 'base' ? 'base' : 'level2'}
                    rounded="xs"
                    insetY="xxs"
                    insetX="xxs"
                >
                    <Icon
                        type={
                            asset.chain === 'solana-mainnet'
                                ? 'solana'
                                : asset.chain === 'base'
                                ? 'base'
                                : 'ethFilled'
                        }
                        size="square_xxs"
                    />
                </Box>
            )}
        </Box>
    ) : (
        <Icon size="square_lg" type="token" color="gray1" />
    )
}
