import React, { useMemo } from 'react'
import { TokenTransferEvent } from '@river-build/sdk'
import { bin_toHexString, bin_toString } from '@river-build/dlog'
import { Box, Stack, Text } from '@ui'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { formatUnits } from 'hooks/useBalance'

type Props = {
    event: TokenTransferEvent
}
export const TokenTransfer = (props: Props) => {
    const { event } = props
    const coinDataParams = useMemo(() => {
        const chainId = event.transaction.receipt
            ? event.transaction.receipt.chainId.toString()
            : 'solana-mainnet'
        const address =
            chainId === 'solana-mainnet'
                ? bin_toString(event.transfer.address)
                : bin_toHexString(event.transfer.address)
        return { address, chain: chainId }
    }, [event])

    const { data: coinData } = useCoinData(coinDataParams)

    const text = useMemo(() => {
        const formattedAmount = formatUnits(
            BigInt(event.transfer.amount),
            coinData?.token.decimals ?? 9,
        )
        const verb = event.transfer.isBuy ? 'Bought' : 'Sold'
        const symbol = coinData?.token.symbol ?? ''
        return `${verb} ${formattedAmount} ${symbol}`
    }, [event, coinData])

    return (
        <Stack horizontal>
            <Box
                shrink
                grow={false}
                justifyContent="start"
                background={event.transfer.isBuy ? 'positiveSubtle' : 'negativeSubtle'}
                paddingX="sm"
                alignItems="start"
                rounded="xs"
            >
                <Text
                    // using separate vpadding here to avoid text clipping
                    paddingBottom="sm"
                    paddingTop="sm"
                    color={event.transfer.isBuy ? 'greenBlue' : 'error'}
                >
                    {text}
                </Text>
            </Box>
            <Box grow />
        </Stack>
    )
}
