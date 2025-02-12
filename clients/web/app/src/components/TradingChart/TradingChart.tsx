import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TickerAttachment } from '@river-build/sdk'
import {
    AreaSeries,
    CandlestickSeries,
    ColorType,
    IChartApi,
    UTCTimestamp,
    createChart,
} from 'lightweight-charts'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { themes } from 'ui/styles/themes'
import { Box, Button, Dropdown, IconButton, Pill, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { useStore } from 'store/store'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { env } from 'utils'

function formatUSD(value: number): string {
    return (
        '$' +
        new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value)
    )
}

export const TradingChart = (props: { attachment: TickerAttachment }) => {
    const { attachment } = props
    const [days, setDays] = useState<string>('1')
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area')

    const onToggleChartType = useCallback(() => {
        setChartType((t) => (t === 'area' ? 'candlestick' : 'area'))
    }, [])

    const { data: coinData } = useCoinData({
        address: attachment.address,
        chain: attachment.chainId,
    })
    const { data: ohlcData, isLoading: isLoadingOHLCData } = useCoinOHLCHistoricalData({
        coinId: coinData?.id,
        days: days,
    })
    const { data: historicalData, isLoading: isLoadingHistoricalData } = useCoinHistoricalData({
        address: attachment.address,
        chain: attachment.chainId,
        days: days,
    })

    const [isFocused, setIsFocused] = useState(false)

    return (
        <Stack rounded="md" width="500" maxWidth="100%" background="level2">
            <Box height="250" width="100%" position="relative">
                <Box
                    roundedTop="md"
                    overflow="hidden"
                    cursor={!isFocused ? 'pointer' : 'default'}
                    onClick={() => setIsFocused(true)}
                >
                    <ChartComponent
                        isFocused={isFocused}
                        data={(chartType === 'area' ? historicalData?.prices : ohlcData) ?? []}
                    />
                </Box>
                {(isLoadingHistoricalData || isLoadingOHLCData) && (
                    <Box position="absoluteCenter" zIndex="above">
                        <ButtonSpinner />
                    </Box>
                )}
                <Box position="absolute" top="md" right="md" zIndex="above">
                    <Stack horizontal gap="sm" alignItems="center" position="relative">
                        <IconButton
                            icon="candlestick"
                            background="level4"
                            color="gray1"
                            rounded="full"
                            shrink={false}
                            onClick={onToggleChartType}
                        />
                        <Dropdown
                            padding="none"
                            defaultValue={days}
                            height="height_md"
                            width="x9"
                            background="level4"
                            rounded="full"
                            options={[
                                { label: '24h', value: '1' },
                                { label: '7d', value: '7' },
                                { label: '1m', value: '30' },
                                { label: '3m', value: '90' },
                                { label: '1y', value: '365' },
                            ]}
                            onChange={(value) => setDays(value)}
                        />
                    </Stack>
                </Box>
            </Box>

            {coinData && (
                <>
                    <Stack padding gap="paragraph">
                        <Stack horizontal alignItems="center">
                            <Stack horizontal gap="sm" alignItems="center">
                                <Box
                                    width="x2.5"
                                    height="x2.5"
                                    background="accent"
                                    rounded="full"
                                    as="img"
                                    src={coinData.image.small}
                                />
                                <ClipboardCopy
                                    color="default"
                                    fontSize="sm"
                                    clipboardContent={attachment.address}
                                    label={coinData.name}
                                />
                            </Stack>
                            <Box grow />
                            <Box>
                                <NetworkName
                                    chainId={Number(attachment.chainId)}
                                    size="sm"
                                    color="initial"
                                />
                            </Box>
                        </Stack>

                        <Text fontWeight="strong" fontSize="lg">
                            ${coinData.market_data.current_price.usd}
                        </Text>

                        <Stack horizontal grow gap="sm">
                            <Text
                                truncate
                                size="sm"
                                color={
                                    coinData.market_data.price_change_percentage_24h > 0
                                        ? 'greenBlue'
                                        : 'error'
                                }
                            >
                                {coinData.market_data.price_change_percentage_24h}%
                            </Text>
                            <Text color="gray2" size="sm">
                                Past day
                            </Text>
                        </Stack>
                        <Stack horizontal grow gap="sm" color="gray1">
                            <Pill background="level3" color="inherit">
                                VOL {formatUSD(coinData.market_data.total_volume.usd)}
                            </Pill>
                            <Pill background="level3" color="inherit">
                                MCAP {formatUSD(coinData.market_data.market_cap.usd)}
                            </Pill>
                            <Pill background="level3" color="inherit">
                                FDV {formatUSD(coinData.market_data.fully_diluted_valuation.usd)}
                            </Pill>
                        </Stack>
                        <Stack horizontal gap="sm">
                            <Button grow tone="level3" rounded="full" color="cta1">
                                Buy
                            </Button>
                            <Button grow tone="level3" rounded="full" color="cta1">
                                Sell
                            </Button>
                        </Stack>
                    </Stack>
                </>
            )}
        </Stack>
    )
}

const ChartComponent = (props: {
    isFocused: boolean
    data: [number, number][] | [number, number, number, number, number][]
}) => {
    const { isFocused, data } = props

    const { getTheme } = useStore()
    const theme = getTheme()

    const backgroundColor = themes[theme].background.level2
    const lineColor = themes[theme].foreground.cta2
    const textColor = themes[theme].foreground.gray2
    const areaTopColor = themes[theme].background.cta2
    const areaBottomColor = themes[theme].background.level3

    const chartContainerRef = useRef<HTMLElement>(null)

    const [chart, setChart] = useState<IChartApi | null>(null)

    useEffect(() => {
        const current = chartContainerRef.current
        if (!current) {
            return
        }
        if (data.length === 0) {
            return
        }

        const c = createChart(current, {
            layout: {
                background: {
                    color: backgroundColor,
                    type: ColorType.Solid,
                },
                textColor,
            },
            width: current.clientWidth,
            height: 250,
            leftPriceScale: {
                visible: false,
            },

            rightPriceScale: {
                visible: false,
                borderVisible: false,
                textColor: themes.dark.foreground.gray2,
            },

            grid: {
                vertLines: {
                    visible: false,
                },
                horzLines: {
                    visible: false,
                },
            },
            timeScale: {
                ticksVisible: false,
                borderVisible: false,
            },
        })
        c.timeScale().fitContent()

        if (data[0].length === 2) {
            const areaSeries = c.addSeries(AreaSeries, {
                lineColor,
                topColor: areaTopColor,
                bottomColor: areaBottomColor,
                lineWidth: 4,
            })
            const formattedData = data.map(([time, value]) => {
                return { time: (time / 1000) as UTCTimestamp, value }
            })
            areaSeries.setData(formattedData)
        } else {
            const candleStickSeries = c.addSeries(CandlestickSeries, {})
            const formattedData = data.map(([time, open, high, low, close]) => {
                return { time: (time / 1000) as UTCTimestamp, open, high, low, close }
            })
            candleStickSeries.setData(formattedData)
        }
        setChart(c)

        const handleResize = () => {
            try {
                c.applyOptions({ width: current.clientWidth })
            } catch (e) {
                console.log(e)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            c.remove()
        }
    }, [data, lineColor, textColor, areaTopColor, areaBottomColor, backgroundColor])

    useEffect(() => {
        if (!chart) {
            return
        }
        if (isFocused) {
            chart.timeScale().applyOptions({
                visible: true,
            })
            chart.priceScale('left').applyOptions({
                visible: true,
            })
        } else {
            chart.timeScale().applyOptions({
                visible: false,
            })
            chart.priceScale('right').applyOptions({
                visible: false,
            })
        }
    }, [isFocused, chart])

    return <Box ref={chartContainerRef} pointerEvents={isFocused ? 'auto' : 'none'} />
}

type MarketDataEntry = {
    eth: number
    btc: number
    usd: number
}

const zMarketDataEntry: z.ZodType<MarketDataEntry> = z.object({
    eth: z.number(),
    btc: z.number(),
    usd: z.number(),
})

type GetCoinDataResponse = {
    id: string
    name: string
    market_data: {
        ath: MarketDataEntry
        current_price: MarketDataEntry
        market_cap: MarketDataEntry
        fully_diluted_valuation: MarketDataEntry
        total_volume: MarketDataEntry
        price_change_percentage_24h: number
    }
    image: {
        small: string
    }
}

const zCoinData: z.ZodType<GetCoinDataResponse> = z.object({
    id: z.string(),
    name: z.string(),
    market_data: z.object({
        ath: zMarketDataEntry,
        current_price: zMarketDataEntry,
        market_cap: zMarketDataEntry,
        fully_diluted_valuation: zMarketDataEntry,
        total_volume: zMarketDataEntry,
        price_change_percentage_24h: z.number(),
    }),
    image: z.object({
        small: z.string(),
    }),
})

const useCoinData = (props: { address: string; chain: string }) => {
    const { data, error } = useQuery({
        queryKey: ['get-coin-data', `${props.address}`],
        queryFn: async () => {
            const url = `https://pro-api.coingecko.com/api/v3/coins/${props.chain}/contract/${props.address}`
            const result = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-pro-api-key': env.VITE_COINGECKO_API_KEY ?? '',
                },
            })
            return result.json()
        },
        select: (response) => {
            console.log('coin data', response)
            return zCoinData.safeParse(response).data
        },
        enabled: !!env.VITE_COINGECKO_API_KEY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 15,
    })

    console.log('Coin Data', data, error)
    return { data }
}

const zPricesData: z.ZodType<{ prices: [number, number][] }> = z.object({
    prices: z.array(z.tuple([z.number(), z.number()])),
})

const zOHLCData: z.ZodType<[number, number, number, number, number][]> = z.array(
    z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
)

const useCoinHistoricalData = (props: { address: string; chain: string; days: string }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['get-pools', `${props.address}`, props.days],
        queryFn: async () => {
            const url = `https://pro-api.coingecko.com/api/v3/coins/${props.chain}/contract/${props.address}/market_chart?vs_currency=usd&days=${props.days}`
            const result = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-pro-api-key': env.VITE_COINGECKO_API_KEY ?? '',
                },
            })
            return result.json()
        },
        select: (response) => {
            return zPricesData.safeParse(response).data
        },
        enabled: !!env.VITE_COINGECKO_API_KEY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 15,
    })

    return { data, isLoading }
}

const useCoinOHLCHistoricalData = (props: { coinId?: string; days: string }) => {
    const { data, isLoading } = useQuery({
        queryKey: ['get-ohlc', `${props.coinId}`, props.days],
        queryFn: async () => {
            const url = `https://pro-api.coingecko.com/api/v3/coins/${props.coinId}/ohlc?vs_currency=usd&days=${props.days}`
            const result = await fetch(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-pro-api-key': env.VITE_COINGECKO_API_KEY ?? '',
                },
            })
            return result.json()
        },
        select: (response) => {
            return zOHLCData.safeParse(response).data
        },
        enabled: props.coinId !== undefined && !!env.VITE_COINGECKO_API_KEY,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 15,
    })

    return { data, isLoading }
}
