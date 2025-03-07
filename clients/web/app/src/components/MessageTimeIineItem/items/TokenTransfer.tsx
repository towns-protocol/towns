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
        const parsedAmount = BigInt(amount)
        const formattedAmount = () => {
            // if the amount is less than 10^(decimals - 2)
            // we need to show the amount in the smallest possible unit
            // this mainly applies to super small quantities of tokens
            // like 200 $WIF or (which has 6 decimals)
            if (!coinData?.token.decimals) {
                return ''
            }
            if (parsedAmount < 10n ** BigInt(coinData.token.decimals - 2)) {
                return (Number(parsedAmount) / 10 ** coinData.token.decimals).toFixed(3)
            }
            const preFormattedAmount = Number(
                formatUnitsToFixedLength(parsedAmount, coinData?.token.decimals, 2),
            )
            return Intl.NumberFormat('en-US', { notation: 'compact' }).format(preFormattedAmount)
        }

        const verb = isBuy ? 'Bought' : 'Sold'
        const symbol = coinData?.token.symbol ?? ''
        return `${verb} ${formattedAmount()} ${symbol}`
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
