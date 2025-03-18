import React, { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Box, Icon, Stack, Text } from '@ui'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { notUndefined } from 'ui/utils/utils'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import ethIcon from 'ui/components/Icon/assets/eth.svg?url'
import solIcon from 'ui/components/Icon/assets/solana.svg?url'
import { ChainWalletAssets, formatCents } from './tradingUtils'
import { TokenIcon } from './ui/TokenIcon'
import { isTradingChain, tradingChains } from './tradingConstants'

export const TradingTokensList = ({
    assets,
    isLoading,
}: {
    assets: ChainWalletAssets[]
    isLoading: boolean
}) => {
    const flattenedAssets = useMemo(() => {
        return assets
            .map((asset) => asset.tokens)
            .flat()
            .sort((a, b) => b.holdingValueCents - a.holdingValueCents)
    }, [assets])

    const baseNativeAsset = useMemo(() => {
        const asset = assets.find((asset) => asset.chain === '8453')
        if (!asset) {
            return
        }
        return {
            ...asset.nativeAsset,
            imageUrl: ethIcon,
            decimals: 18,
            tokenAddress: '',
            symbol: 'BASE',
            name: 'Base',
            walletAddress: asset.walletAddress,
            chain: '8453',
        } as const
    }, [assets])

    const solNativeAsset = useMemo(() => {
        const asset = assets.find((asset) => asset.chain === 'solana-mainnet')
        if (!asset) {
            return
        }
        return {
            ...asset.nativeAsset,
            imageUrl: solIcon,
            decimals: 9,
            tokenAddress: '',
            symbol: 'SOL',
            name: 'Solana',
            walletAddress: asset.walletAddress,
            chain: 'solana-mainnet',
        } as const
    }, [assets])

    const allAssets = useMemo(() => {
        return [baseNativeAsset, solNativeAsset, ...flattenedAssets]
            .filter(notUndefined)
            .map((asset) => ({
                ...asset,
                chain: isTradingChain(asset.chain) ? asset.chain : undefined,
            }))
    }, [baseNativeAsset, solNativeAsset, flattenedAssets])

    if (isLoading) {
        return (
            <Box paddingY="x4">
                <ButtonSpinner />
            </Box>
        )
    }

    return (
        <>
            {allAssets.map((token) => (
                <AssetEntry asset={token} key={token.tokenAddress + token.chain} />
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
    chain: keyof typeof tradingChains | undefined
    walletAddress?: string
}

const AssetEntry = ({ asset }: { asset: AssetData }) => {
    const pct = 1 + asset.priceChange24h
    const value24hAgo = asset.holdingValueCents / pct
    const diff24h = asset.holdingValueCents - value24hAgo

    const { openPanel } = usePanelActions()
    const onClick = useCallback(() => {
        if (asset.tokenAddress) {
            openPanel('trade', {
                mode: 'sell',
                tokenAddress: asset.tokenAddress,
                chainId: asset.chain,
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
                <Text color={asset.priceChange24h > 0 ? 'positive' : 'peach'}>
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
