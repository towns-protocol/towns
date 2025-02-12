import React, { useMemo } from 'react'
import { Stack, Text } from '@ui'
import { TMentionTicker } from './types'

export const ComboboxTrailingTickerContent = ({ item }: { item: TMentionTicker }) => {
    const { marketCap, priceUSD } = item
    const formattedMarketCap = useMemo(() => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
        }).format(Number(marketCap))
    }, [marketCap])

    return (
        <Stack horizontal gap="sm" fontSize="sm">
            <Text color="gray2">MCAP {formattedMarketCap}</Text>
            <Text color="default">${Number(priceUSD).toPrecision(5)}</Text>
        </Stack>
    )
}
