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
import { zip } from 'lodash'
import { themes } from 'ui/styles/themes'
import { Box, Button, Dropdown, IconButton, Pill, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { useStore } from 'store/store'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { formatCompactUSD, formatUSD } from '@components/Web3/Trading/tradingUtils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { GetBars, TimeFrame, useCoinBars } from './useCoinBars'
import { useCoinData } from './useCoinData'

const CHART_TIME_FORMAT_OPTIONS: {
    [key: string]: object
} = {
    '1h': { hour: '2-digit', minute: '2-digit' },
    '1d': { hour: '2-digit' },
    '7d': { month: 'short', day: 'numeric' },
    '30d': { month: 'short', day: 'numeric' },
    '90d': { month: 'short', day: 'numeric' },
    '365d': { month: 'short', year: 'numeric' },
}

export const TradingChart = (props: { attachment: TickerAttachment }) => {
    const { attachment } = props
    const [timeframe, setTimeframe] = useState<TimeFrame>('1d')
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area')

    const onToggleChartType = useCallback(() => {
        setChartType((t) => (t === 'area' ? 'candlestick' : 'area'))
    }, [])

    const { data: coinData } = useCoinData({
        address: attachment.address,
        chain: attachment.chainId,
    })

    const { data: barData, isLoading: isLoadingData } = useCoinBars({
        address: attachment.address,
        chain: attachment.chainId,
        timeframe: timeframe,
    })

    const [isFocused, setIsFocused] = useState(false)

    const { openPanel } = usePanelActions()

    const onTradeClick = useCallback(
        (mode: 'buy' | 'sell') => {
            openPanel(CHANNEL_INFO_PARAMS.TRADE_PANEL, {
                mode,
                tokenAddress: props.attachment.address,
                chainId: props.attachment.chainId.toString(),
            })
        },
        [openPanel, props.attachment.address, props.attachment.chainId],
    )

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
                        data={barData}
                        chartType={chartType}
                        timeframe={timeframe}
                    />
                </Box>
                {isLoadingData && (
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
                            defaultValue={timeframe}
                            height="height_md"
                            width="x9"
                            background="level4"
                            rounded="full"
                            options={[
                                { label: '1h', value: '1h' },
                                { label: '24h', value: '1d' },
                                { label: '7d', value: '7d' },
                                { label: '1m', value: '30d' },
                                { label: '3m', value: '90d' },
                                { label: '1y', value: '365d' },
                            ]}
                            onChange={(value) => setTimeframe(value as TimeFrame)}
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
                                    src={coinData.token.info.imageThumbUrl ?? ''}
                                />
                                <ClipboardCopy
                                    color="default"
                                    fontSize="sm"
                                    clipboardContent={attachment.address}
                                    label={coinData.token.name}
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
                            {formatUSD(Number(coinData.priceUSD))}
                        </Text>

                        <Stack horizontal grow gap="sm">
                            <Text
                                truncate
                                size="sm"
                                color={Number(coinData.change24) > 0 ? 'greenBlue' : 'error'}
                            >
                                {Number(coinData.change24).toFixed(2)}%
                            </Text>
                            <Text color="gray2" size="sm">
                                Past day
                            </Text>
                        </Stack>
                        <Stack horizontal grow gap="sm" color="gray1">
                            <Pill background="level3" color="inherit">
                                LIQ {formatCompactUSD(Number(coinData.liquidity))}
                            </Pill>
                            <Pill background="level3" color="inherit">
                                VOL {formatCompactUSD(Number(coinData.volume24))}
                            </Pill>
                            <Pill background="level3" color="inherit">
                                MCAP {formatCompactUSD(Number(coinData.marketCap))}
                            </Pill>
                            <Pill background="level3" color="inherit">
                                HDLRS {coinData.holders}
                            </Pill>
                        </Stack>
                        <Stack horizontal gap="sm">
                            <Button
                                grow
                                tone="level3"
                                rounded="full"
                                color="cta1"
                                onClick={() => onTradeClick('buy')}
                            >
                                Buy
                            </Button>
                            <Button
                                grow
                                tone="level3"
                                rounded="full"
                                color="cta1"
                                onClick={() => onTradeClick('sell')}
                            >
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
    data: GetBars
    timeframe: TimeFrame
    chartType: 'area' | 'candlestick'
}) => {
    const { isFocused, data, chartType, timeframe } = props

    const { getTheme } = useStore()
    const theme = getTheme()

    const backgroundColor = themes[theme].background.level2
    const lineColor = themes[theme].foreground.cta2
    const textColor = themes[theme].foreground.gray2
    const areaTopColor = themes[theme].background.cta2
    const areaBottomColor = themes[theme].background.level3
    const chartContainerRef = useRef<HTMLElement>(null)
    const timeFrameOptions = CHART_TIME_FORMAT_OPTIONS[timeframe]
    const [chart, setChart] = useState<IChartApi | null>(null)

    useEffect(() => {
        const current = chartContainerRef.current
        if (!current) {
            return
        }
        if (data.o.length === 0) {
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
                tickMarkFormatter: (timestamp: UTCTimestamp) => {
                    return new Date(timestamp * 1000).toLocaleString('en-US', timeFrameOptions)
                },
                ticksVisible: false,
                borderVisible: false,
            },
        })
        c.timeScale().fitContent()

        if (chartType === 'area') {
            const areaSeries = c.addSeries(AreaSeries, {
                lineColor,
                topColor: areaTopColor,
                bottomColor: areaBottomColor,
                lineWidth: 4,
            })
            const formattedData = zip(data.t, data.c).map(([time, close]) => {
                return { time: time as UTCTimestamp, value: close }
            })
            areaSeries.setData(formattedData)
        } else {
            const candleStickSeries = c.addSeries(CandlestickSeries, {})
            const formattedData = zip(data.t, data.o, data.h, data.l, data.c).map(
                ([time, open, high, low, close]) => {
                    return { time: time as UTCTimestamp, open, high, low, close }
                },
            )
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
    }, [
        data,
        lineColor,
        textColor,
        areaTopColor,
        areaBottomColor,
        backgroundColor,
        chartType,
        timeFrameOptions,
    ])

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
