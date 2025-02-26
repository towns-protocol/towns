import React, { useCallback, useLayoutEffect, useRef, useState } from 'react'
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
import { useInView } from 'react-intersection-observer'
import { themes } from 'ui/styles/themes'
import { Box, Button, Dropdown, Icon, IconButton, Pill, SizeBox, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useStore } from 'store/store'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { formatCompactUSD } from '@components/Web3/Trading/tradingUtils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { TokenIcon } from '@components/Web3/Trading/ui/TokenIcon'
import { TokenPrice } from '@components/Web3/Trading/ui/TokenPrice'
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

export const TradingChartAttachment = (props: { attachment: TickerAttachment }) => {
    const { ref, inView } = useInView({
        rootMargin: '10px 0px',
    })
    const { openPanel } = usePanelActions()
    const remappedChain =
        props.attachment.chainId === '1151111081099710'
            ? 'solana-mainnet'
            : props.attachment.chainId

    const onTradeClick = useCallback(
        (mode: 'buy' | 'sell') => {
            // a little workaround to cover the case where old tickers were posted
            // a temp chainId for solana
            openPanel(CHANNEL_INFO_PARAMS.TRADE_PANEL, {
                mode,
                tokenAddress: props.attachment.address,
                chainId: remappedChain,
            })
        },
        [openPanel, props.attachment.address, remappedChain],
    )

    const { containerWidth } = useSizeContext()

    return (
        <Stack
            gap="paragraph"
            rounded="md"
            width="500"
            style={{
                maxWidth: containerWidth - 80,
            }}
            background="level2"
            ref={ref}
            overflow="hidden"
        >
            <TradingChart
                address={props.attachment.address}
                chainId={remappedChain}
                disabled={!inView}
            />
            <Stack horizontal padding paddingTop="none" gap="sm">
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
    )
}
export const TradingChart = (props: { address: string; chainId: string; disabled?: boolean }) => {
    const { address, chainId, disabled } = props

    const [timeframe, setTimeframe] = useState<TimeFrame>('1d')
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area')

    const onToggleChartType = useCallback(() => {
        setChartType((t) => (t === 'area' ? 'candlestick' : 'area'))
    }, [])

    const { data: coinData } = useCoinData({
        address,
        chain: chainId,
        disabled,
    })

    const { data: barData, isLoading: isLoadingData } = useCoinBars({
        address,
        chain: chainId,
        timeframe,
        disabled,
    })

    const [isFocused, setIsFocused] = useState(false)

    return (
        <>
            <Box width="100%" position="relative">
                <SizeBox
                    cursor={!isFocused ? 'pointer' : 'default'}
                    onClick={() => setIsFocused(true)}
                >
                    <ChartComponent
                        isFocused={isFocused}
                        data={barData}
                        chartType={chartType}
                        timeframe={timeframe}
                    />
                </SizeBox>
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
            <Stack paddingX paddingY="none" gap="paragraph">
                {coinData ? (
                    <>
                        <Stack horizontal gap="xs" alignItems="center" insetY="xxs">
                            <TokenIcon
                                asset={{
                                    imageUrl: coinData.token.info.imageThumbUrl ?? '',
                                    chain: chainId,
                                }}
                            />
                            <Box maxWidth="250" overflow="hidden" paddingY="xs">
                                <ClipboardCopy
                                    color="default"
                                    fontSize="lg"
                                    fontWeight="strong"
                                    clipboardContent={address}
                                    label={coinData.token.name}
                                />
                            </Box>
                        </Stack>

                        <Stack horizontal grow gap="xs" alignItems="end">
                            <TokenPrice fontWeight="strong" fontSize="lg" before="$">
                                {coinData.priceUSD}
                            </TokenPrice>
                            <Box
                                horizontal
                                alignItems="center"
                                gap="xs"
                                paddingX="sm"
                                paddingY="xs"
                                rounded="md"
                                insetBottom="xxs"
                                background={
                                    Number(coinData.change24) > 0
                                        ? 'positiveSubtle'
                                        : 'negativeSubtle'
                                }
                            >
                                <Icon
                                    insetY="xxs"
                                    size="square_xxs"
                                    type={
                                        Number(coinData.change24) > 0
                                            ? 'arrowSmallUp'
                                            : 'arrowSmallDown'
                                    }
                                />
                                <Text
                                    fontWeight="strong"
                                    size="sm"
                                    color={Number(coinData.change24) > 0 ? 'greenBlue' : 'error'}
                                >
                                    {Math.abs(Number(coinData.change24)).toFixed(2)}%
                                </Text>
                            </Box>

                            <Text color="gray2" size="sm" fontWeight="medium">
                                24H
                            </Text>
                        </Stack>
                        <Stack grow horizontal gap="sm" color="gray2" flexWrap="wrap">
                            {/* 
                            `codexResponse.marketCap` is actually not the market cap, but the FDV.
                            This is a bit confusing, but it's how the API is.
                            Market cap is `codexResponse.token.info.circulatingSupply * codexResponse.priceUSD`
                            (&#8201; is "thin space")
                            */}
                            <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                LIQ&#8201;{formatCompactUSD(Number(coinData.liquidity))}
                            </Pill>
                            <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                VOL&#8201;{formatCompactUSD(Number(coinData.volume24))}
                            </Pill>
                            <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                MCAP&#8201;
                                {formatCompactUSD(
                                    Number(coinData.token.info.circulatingSupply) *
                                        Number(coinData.priceUSD),
                                )}
                            </Pill>
                            <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                HDLRS&#8201;{coinData.holders}
                            </Pill>
                            <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                FDV&#8201;{formatCompactUSD(Number(coinData.marketCap))}
                            </Pill>
                        </Stack>
                    </>
                ) : (
                    <>
                        <Stack horizontal alignItems="center">
                            <Stack horizontal gap="sm" alignItems="center">
                                <Box
                                    width="x2.5"
                                    height="x2.5"
                                    rounded="full"
                                    className={shimmerClass}
                                />
                            </Stack>
                            <Box grow />
                            <Box>
                                <Box
                                    height="x2"
                                    className={shimmerClass}
                                    width="x12"
                                    rounded="md"
                                />
                            </Box>
                        </Stack>

                        <Box height="x2" className={shimmerClass} width="x12" rounded="md" />

                        <Stack horizontal grow gap="sm">
                            <Box height="x2" className={shimmerClass} width="x12" rounded="md" />
                        </Stack>
                        <Stack horizontal grow gap="sm" color="gray1">
                            <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                            <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                            <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                            <Box height="x2" className={shimmerClass} rounded="md" width="x6" />
                        </Stack>
                    </>
                )}
            </Stack>
        </>
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

    const chartContainerRef = useRef<HTMLElement>(null)

    const backgroundGradientBottom = themes[theme].background.level2
    const backgroundGradientTop = themes[theme].background.level3
    const backgroundColor = themes[theme].background.level2
    const lineColor = themes[theme].foreground.cta2
    const textColor = themes[theme].foreground.gray2
    const areaTopColor = themes[theme].background.cta2
    const areaBottomColor = themes[theme].background.level3

    const timeFrameOptions = CHART_TIME_FORMAT_OPTIONS[timeframe]

    const chartRef = useRef<IChartApi | null>(null)

    const { containerWidth } = useSizeContext()

    const focusChart = useCallback((chart: IChartApi, isFocused: boolean) => {
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
    }, [])

    useLayoutEffect(() => {
        const container = chartContainerRef.current
        if (!container) {
            return
        }
        if (data.o.length === 0) {
            return
        }

        const chart = createChart(container, {
            layout: {
                background: {
                    bottomColor: backgroundGradientBottom,
                    topColor: backgroundGradientTop,
                    type: ColorType.VerticalGradient,
                },
                textColor,
            },
            width: container.clientWidth,
            height: 200,
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

        if (chartType === 'area') {
            const areaSeries = chart.addSeries(AreaSeries, {
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
            const candleStickSeries = chart.addSeries(CandlestickSeries, {})
            const formattedData = zip(data.t, data.o, data.h, data.l, data.c).map(
                ([time, open, high, low, close]) => {
                    return { time: time as UTCTimestamp, open, high, low, close }
                },
            )
            candleStickSeries.setData(formattedData)
        }

        chartRef.current = chart
        chartRef.current.timeScale().fitContent()

        focusChart(chart, false)

        return () => {
            chart.remove()
        }
    }, [
        data,
        lineColor,
        textColor,
        areaTopColor,
        areaBottomColor,
        backgroundColor,
        timeFrameOptions,
        focusChart,
        chartType,
        backgroundGradientBottom,
        backgroundGradientTop,
    ])

    useLayoutEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                width: containerWidth,
            })
            chartRef.current.timeScale().fitContent()
        }
    }, [containerWidth])

    useLayoutEffect(() => {
        if (chartRef.current) {
            focusChart(chartRef.current, isFocused)
        }
    }, [isFocused, focusChart])

    return <Box height="200" ref={chartContainerRef} pointerEvents={isFocused ? 'auto' : 'none'} />
}
