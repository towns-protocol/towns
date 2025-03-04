import React from 'react'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, Stack, Text } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { ChainConfig } from './tradingConstants'
import { useLifiQuote } from './useLifiQuote'
import { QuoteCard } from './ui/QuoteCard'

export const QuotePreview = ({
    chainConfig,
    chainId,
    fromTokenAddress,
    fromTokenData,
    quote,
    toTokenAddress,
    toTokenData,
}: {
    chainConfig: ChainConfig
    chainId: string
    fromTokenAddress: string
    fromTokenData: ReturnType<typeof useCoinData>['data']
    quote: ReturnType<typeof useLifiQuote>
    toTokenAddress: string
    toTokenData: ReturnType<typeof useCoinData>['data']
}) =>
    quote.isLoading ? (
        <Stack gap padding className={shimmerClass} rounded="sm" height="100">
            <Stack height="x4" width="100%" />
            <Stack height="x4" width="100%" />
        </Stack>
    ) : quote.isError ? (
        <Stack
            gap
            padding
            rounded="sm"
            border="negative"
            overflow="hidden"
            background="negativeSubtle"
        >
            <Text size="sm">Error</Text>
            <Box as="pre" fontSize="sm" wrap="wrap">
                {quote.error?.message}
            </Box>
        </Stack>
    ) : quote.data ? (
        <Stack gap="sm">
            <QuoteCard
                chainConfig={chainConfig}
                {...quote.data}
                fromTokenAddress={fromTokenAddress}
                toTokenAddress={toTokenAddress}
                chainId={chainId}
                fromTokenData={fromTokenData}
                toTokenData={toTokenData}
            />
        </Stack>
    ) : (
        <></>
    )
