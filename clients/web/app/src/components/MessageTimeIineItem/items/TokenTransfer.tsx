import React, { useMemo } from 'react'
import { TokenTransferEvent } from '@river-build/sdk'
import { bin_toHexString, bin_toString } from '@river-build/dlog'
import { Box, Stack, Text } from '@ui'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { formatUnitsToFixedLength } from 'hooks/useBalance'

type Props = {
    event: TokenTransferEvent
}

type TokenTransferImplProps = {
    chainId: string
    rawAddress: Uint8Array
    amount: string
    isBuy: boolean
}

export const TokenTransferImpl = (props: TokenTransferImplProps) => {
    const { chainId, rawAddress, amount, isBuy } = props

    const address = useMemo(() => {
        return chainId === 'solana-mainnet'
            ? bin_toString(rawAddress)
            : '0x' + bin_toHexString(rawAddress)
    }, [chainId, rawAddress])

    const { data: coinData } = useCoinData({ address, chain: chainId })

    const text = useMemo(() => {
        const preFormattedAmount = Number(
            formatUnitsToFixedLength(BigInt(amount), coinData?.token.decimals ?? 9, 2),
        )
        const formattedAmount = Intl.NumberFormat('en-US', { notation: 'compact' }).format(
            preFormattedAmount,
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
                background={isBuy ? 'positiveSubtle' : 'negativeSubtle'}
                paddingX="sm"
                alignItems="start"
                rounded="xs"
            >
                <Text paddingBottom="sm" paddingTop="sm" color={isBuy ? 'greenBlue' : 'error'}>
                    {text}
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
        />
    )
}
