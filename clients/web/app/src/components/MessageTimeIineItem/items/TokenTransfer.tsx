import React, { useMemo } from 'react'
import { TokenTransferEvent } from '@towns-protocol/sdk'
import { bin_toHexString, bin_toString } from '@towns-protocol/dlog'
import { Box, Stack, Text } from '@ui'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { useHistoricalTokenPrice } from '@components/Web3/Trading/hooks/useHistoricalTokenPrice'

type Props = {
    event: TokenTransferEvent
}

type TokenTransferImplProps = {
    chainId: string
    rawAddress: Uint8Array
    amount: string
    isBuy: boolean
    createdAtEpochMs: bigint
}

export const TokenTransferImpl = (props: TokenTransferImplProps) => {
    const { chainId, rawAddress, amount, isBuy, createdAtEpochMs } = props
    const address = useMemo(() => {
        return chainId === 'solana-mainnet'
            ? bin_toString(rawAddress)
            : '0x' + bin_toHexString(rawAddress)
    }, [chainId, rawAddress])

    const { data: price } = useHistoricalTokenPrice(
        address,
        chainId,
        parseInt((createdAtEpochMs / 1000n).toString()),
    )

    const { data: coinData } = useCoinData({ address, chain: chainId })
    const formattedUsdAmount = useMemo(() => {
        if (!price || !coinData?.token.decimals || !amount) {
            return undefined
        }

        try {
            // Convert amount to a decimal value based on token decimals
            const amountAsBigInt = BigInt(amount)
            const decimals = coinData.token.decimals

            // Safely convert without using Number() on the full bigint
            // Divide by 10^decimals first to avoid overflow
            const divisor = BigInt(10 ** decimals)
            const wholePart = amountAsBigInt / divisor

            // Handle the fractional part safely
            const fractionalPart = amountAsBigInt % divisor
            const fractionalContribution = Number(fractionalPart) / Number(divisor)

            // Calculate USD value using the whole and fractional parts
            const usdValue = (Number(wholePart) + fractionalContribution) * price

            // Format the USD value
            return `$${Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                minimumSignificantDigits: 2,
                maximumSignificantDigits: 2,
            }).format(usdValue)}`
        } catch (error) {
            console.warn('[TokenTransfer] Failed to calculate USD amount:', error)
            return undefined
        }
    }, [price, amount, coinData?.token.decimals])

    const text = useMemo(() => {
        const formattedAmount = formatUnitsToFixedLength(
            BigInt(amount),
            2,
            coinData?.token.decimals,
            { compact: true },
        )
        const verb = isBuy ? 'Bought' : 'Sold'
        const symbol = coinData?.token.symbol ?? ''
        return `${verb} ${formattedAmount} ${symbol}`
    }, [amount, isBuy, coinData])

    return (
        <Stack horizontal>
            <Box
                shrink
                grow={false}
                justifyContent="start"
                background={isBuy ? 'positiveSubtle' : 'peachSubtle'}
                paddingX="sm"
                alignItems="start"
                rounded="sm"
            >
                <Text paddingBottom="sm" paddingTop="sm" color={isBuy ? 'positive' : 'peach'}>
                    {text}
                    {formattedUsdAmount && ` for ${formattedUsdAmount}`}
                </Text>
            </Box>
            <Box grow />
        </Stack>
    )
}

export const TokenTransfer = (props: Props) => {
    const { event } = props
    const chainId = event.transaction.receipt
        ? event.transaction.receipt.chainId.toString()
        : 'solana-mainnet'

    return (
        <TokenTransferImpl
            chainId={chainId}
            rawAddress={event.transfer.address}
            amount={event.transfer.amount}
            isBuy={event.transfer.isBuy}
            createdAtEpochMs={event.createdAtEpochMs}
        />
    )
}
