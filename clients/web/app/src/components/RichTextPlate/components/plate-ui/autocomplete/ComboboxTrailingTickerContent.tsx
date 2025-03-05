import React, { useMemo } from 'react'
import { Stack, Text } from '@ui'
import { formatCompactNumber } from '@components/Web3/Trading/tradingUtils'
import { TokenPrice } from '@components/Web3/Trading/ui/TokenPrice'
import { TMentionTicker } from './types'

export const ComboboxTrailingTickerContent = ({ item }: { item: TMentionTicker }) => {
    const { marketCap, priceUSD } = item
    const formattedMarketCap = useMemo(() => {
        return '$' + formatCompactNumber(Number(marketCap))
    }, [marketCap])

    return (
        <Stack fontSize="sm" gap="sm" justifyContent="spaceBetween" alignItems="end">
            <TokenPrice size="sm" before="$">
                {priceUSD}
            </TokenPrice>
            <Text color="gray2" fontSize="xs">
                MCAP {formattedMarketCap}
            </Text>
        </Stack>
    )
}
