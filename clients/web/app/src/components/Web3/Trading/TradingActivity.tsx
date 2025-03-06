import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { intlFormatDistance } from 'date-fns'
import { Box, Stack, Text } from '@ui'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'
import { TradingActivityItem, useTradingActivity } from './hooks/useTradingActivity'

export const TradingActivity = () => {
    const { solanaWalletAddress, evmWalletAddress } = useTradingWalletAddresses()
    const { data: baseData, isLoading: isBaseLoading } = useTradingActivity(
        evmWalletAddress,
        '8453',
    )
    const { data: solanaData, isLoading: isSolanaLoading } = useTradingActivity(
        solanaWalletAddress,
        'solana-mainnet',
    )
    const allData = useMemo(() => {
        return [...baseData, ...solanaData].sort((a, b) => b.timestamp - a.timestamp)
    }, [baseData, solanaData])

    if (isBaseLoading && isSolanaLoading) {
        return (
            <Box paddingY="x4">
                <ButtonSpinner />
            </Box>
        )
    }

    return (
        <Stack>
            {allData.map((item) => {
                // the same event hash can occur multiple times, but with different amounts 🤷‍♂️
                const key = JSON.stringify({
                    txHash: item.transactionHash,
                    data: item.data,
                })
                return <TradingActivityEntry key={key} item={item} />
            })}
        </Stack>
    )
}

function absBigInt(value: bigint) {
    return value < 0n ? -value : value
}

const SOLANA_CODEX_NETWORK_ID = 1399811149
const TradingActivityEntry = (props: { item: TradingActivityItem }) => {
    const { item } = props
    const baseLink =
        item.networkId === SOLANA_CODEX_NETWORK_ID
            ? 'https://solscan.io/tx/'
            : 'https://basescan.org/tx/'
    const isSell = item.eventDisplayType === 'Sell'
    const { fromTokenMetadata, toTokenMetadata, fromAmount, toAmount } = useMemo(() => {
        let fromTokenIsToken0 = true
        let fromAmount: bigint = 0n
        let toAmount: bigint = 0n

        // SOLANA vs EVM token amounts are treated differently
        // i've tried to keep it as readable as possible, and avoided ternaries
        // as much as possible
        if (
            item.networkId === SOLANA_CODEX_NETWORK_ID ||
            (item.data.amount0 && item.data.amount1)
        ) {
            const amount0 = BigInt(item.data.amount0 ?? '0')
            fromTokenIsToken0 = amount0 > 0n
            if (fromTokenIsToken0) {
                fromAmount = absBigInt(BigInt(item.data.amount0 ?? '0'))
                toAmount = absBigInt(BigInt(item.data.amount1 ?? '0'))
            } else {
                fromAmount = absBigInt(BigInt(item.data.amount1 ?? '0'))
                toAmount = absBigInt(BigInt(item.data.amount0 ?? '0'))
            }
        } else {
            fromTokenIsToken0 = BigInt(item.data.amount0In ?? '0') > 0n
            const amount0 = BigInt(
                (item.data.amount0In !== '0' ? item.data.amount0In : item.data.amount0Out) ?? '0',
            )
            const amount1 = BigInt(
                (item.data.amount1In !== '0' ? item.data.amount1In : item.data.amount1Out) ?? '0',
            )
            fromAmount = absBigInt(amount0)
            toAmount = absBigInt(amount1)
        }
        // this is a little tricky but it's the only way i've found
        // to reliably keep track of what token is being sold and what token is being bought
        if (fromTokenIsToken0) {
            return {
                fromTokenMetadata: item.token0Metadata,
                toTokenMetadata: item.token1Metadata,
                fromAmount: fromAmount,
                toAmount: toAmount,
            }
        } else {
            return {
                fromTokenMetadata: item.token1Metadata,
                toTokenMetadata: item.token0Metadata,
                fromAmount: fromAmount,
                toAmount: toAmount,
            }
        }
    }, [item])

    const formattedSubtitle = useMemo(() => {
        if (!fromTokenMetadata || !toTokenMetadata) {
            return 'Unknown token'
        }
        return `${formatUnitsToFixedLength(fromAmount, fromTokenMetadata.decimals, 2)} ${
            fromTokenMetadata.symbol
        } → ${formatUnitsToFixedLength(toAmount, toTokenMetadata.decimals, 2)} ${
            toTokenMetadata.symbol
        }`
    }, [fromTokenMetadata, toTokenMetadata, fromAmount, toAmount])

    return (
        <Stack padding horizontal gap alignItems="center">
            <Box square="square_lg" position="relative">
                <Box
                    as="img"
                    src={fromTokenMetadata?.info.imageThumbUrl ?? ''}
                    square="square_sm"
                    background="cta1"
                    position="topLeft"
                    rounded="full"
                />
                <Box
                    as="img"
                    src={toTokenMetadata?.info.imageThumbUrl ?? ''}
                    square="square_sm"
                    background="cta2"
                    position="bottomRight"
                    rounded="full"
                />
            </Box>
            <Stack gap="sm">
                <Link to={baseLink + item.transactionHash} target="_blank">
                    <Text fontWeight="strong">
                        {isSell ? 'SOLD' : 'BOUGHT'} $
                        {/* Some symbols have $ baked into them, need to remove it to avoid printing $$SYMBOL */}
                        {(isSell ? fromTokenMetadata?.symbol : toTokenMetadata?.symbol)?.replace(
                            '$',
                            '',
                        )}
                    </Text>
                </Link>
                <Text color="gray2">{formattedSubtitle}</Text>
            </Stack>
            <Box grow />
            <Text color="gray2" textAlign="right">
                {intlFormatDistance(new Date(item.timestamp * 1000), Date.now())}
            </Text>
        </Stack>
    )
}
