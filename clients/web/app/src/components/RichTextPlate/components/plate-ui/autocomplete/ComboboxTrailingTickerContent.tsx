import React, { useMemo } from 'react'
import { Stack, Text } from '@ui'
import { formatCompactUSD } from '@components/Web3/Trading/tradingUtils'
import { TMentionTicker } from './types'

export const ComboboxTrailingTickerContent = ({ item }: { item: TMentionTicker }) => {
    const { marketCap, priceUSD } = item
    const formattedMarketCap = useMemo(() => {
        return formatCompactUSD(Number(marketCap))
    }, [marketCap])

    return (
        <Stack horizontal gap="sm" fontSize="sm">
            <Text color="gray2">MCAP {formattedMarketCap}</Text>
            <Text color="default">${Number(priceUSD).toPrecision(5)}</Text>
        </Stack>
    )
}
