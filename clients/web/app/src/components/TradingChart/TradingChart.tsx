import { isThisYear, isToday } from 'date-fns'
import {
    AreaData,
    AreaSeries,
    AreaSeriesOptions,
    AreaStyleOptions,
    CandlestickData,
    CandlestickSeries,
    CandlestickSeriesOptions,
    CandlestickStyleOptions,
    ColorType,
    DeepPartial,
    IChartApi,
    ISeriesApi,
    ISeriesPrimitive,
    LineStyle,
    MouseEventHandler,
    SeriesAttachedParameter,
    SeriesOptionsCommon,
    SeriesType,
    Time,
    UTCTimestamp,
    WhitespaceData,
    createChart,
} from 'lightweight-charts'
import { zip } from 'lodash'
import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useUserLookupContext } from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { TickerThreadContext } from '@components/MessageThread/TickerThreadContext'
import { TokenTransferImpl } from '@components/MessageTimeIineItem/items/TokenTransfer'
import {
    TokenTransferRollupEvent,
    useTradingContext,
} from '@components/Web3/Trading/TradingContextProvider'
import { formatCompactNumber } from '@components/Web3/Trading/tradingUtils'
import { useTokenBalance } from '@components/Web3/Trading/useTokenBalance'
import { Box, Dropdown, IconButton, SizeBox, Stack, Text } from '@ui'
import { useStore } from 'store/store'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { ToneName, themes } from 'ui/styles/themes'
import { vars } from 'ui/styles/vars.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { TickerInfoBox } from './TickerInfoBox'
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

export const TradingChart = (props: { address: string; chainId: string; disabled?: boolean }) => {
    const { address, chainId, disabled } = props
    const balance = useTokenBalance(chainId, address)
    const [timeframe, setTimeframe] = useState<TimeFrame>('1d')
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area')

    const isTradingThreadContext = useContext(TickerThreadContext) !== undefined

    const { tokenTransferRollups } = useTradingContext()

    const transfers = useMemo(() => {
        const transfers = tokenTransferRollups[address] ?? []
        return transfers
    }, [tokenTransferRollups, address])

    const tradingUserIds = useMemo(() => {
        const userIds = transfers.reduce((acc, transfer) => {
            acc.add(transfer.userId)
            return acc
        }, new Set<string>())
        return Array.from(userIds)
    }, [transfers])

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

    return (
        <>
            <Box width="100%" position="relative">
                <SizeBox>
                    <ChartComponent
                        data={barData}
                        chartType={chartType}
                        timeframe={timeframe}
                        transfers={transfers}
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
                            icon={chartType === 'candlestick' ? 'candlestick' : 'linechart'}
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
            <Stack paddingX paddingY="none" gap="md">
                <TickerInfoBox
                    minimal={isTradingThreadContext}
                    coinData={coinData}
                    address={address}
                    chainId={chainId}
                    balance={balance}
                    tradingUserIds={tradingUserIds}
                />
            </Stack>
        </>
    )
}

const ChartComponent = (props: {
    data: GetBars
    timeframe: TimeFrame
    chartType: 'area' | 'candlestick'
    transfers: TokenTransferRollupEvent[]
}) => {
    const { data, chartType, timeframe, transfers } = props

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

    const [transferMapRef] = useState(() => {
        return { current: new Map<number, HTMLElement | null>() }
    })

    const filteredTransfers = useMemo(() => {
        if (data.t.length === 0) {
            return []
        }
        return transfers.filter((transfer) => {
            return (
                Number(transfer.createdAtEpochMs) / 1000 > data.t[0] - 3600 && // 1hr before
                Number(transfer.createdAtEpochMs) / 1000 < data.t[data.t.length - 1] + 3600 // 1hr after
            )
        })
    }, [transfers, data])

    const crosshairRef = useRef<HTMLDivElement>(null)

    useLayoutEffect(() => {
        const container = chartContainerRef.current
        if (!container) {
            return
        }
        if (data.o.length === 0) {
            return
        }

        const chart = createChart(container, {
            handleScale: false,
            handleScroll: false,

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
            crosshair: {
                mode: 1,
                horzLine: {
                    visible: false,
                },
                vertLine: {
                    color: themes.dark.tone.cta2,
                    width: 1,
                    style: LineStyle.Dotted,
                },
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

        let areaSeries: ISeriesApi<
            'Area',
            Time,
            AreaData<Time> | WhitespaceData<Time>,
            AreaSeriesOptions,
            DeepPartial<AreaStyleOptions & SeriesOptionsCommon>
        >

        let candleStickSeries: ISeriesApi<
            'Candlestick',
            Time,
            CandlestickData<Time> | WhitespaceData<Time>,
            CandlestickSeriesOptions,
            DeepPartial<CandlestickStyleOptions & SeriesOptionsCommon>
        >

        if (chartType === 'area') {
            areaSeries = chart.addSeries(AreaSeries, {
                lineColor,
                topColor: areaTopColor,
                bottomColor: areaBottomColor,
                lineWidth: 4,
            })
            const formattedData = zip(data.t, data.c).map(([time, close]) => {
                return { time: time as UTCTimestamp, value: close }
            })
            areaSeries.setData(formattedData)
            areaSeries.attachPrimitive(
                new ChartAvatarSeriesPrimitive(chart, filteredTransfers, transferMapRef),
            )
        } else {
            candleStickSeries = chart.addSeries(CandlestickSeries, {})
            const formattedData = zip(data.t, data.o, data.h, data.l, data.c)
                .filter((values): values is [number, number, number, number, number] =>
                    values.every((v) => v !== undefined),
                )
                .map(([time, open, high, low, close]) => ({
                    time: time as UTCTimestamp,
                    open,
                    high,
                    low,
                    close,
                }))
            candleStickSeries.setData(formattedData)
            candleStickSeries.attachPrimitive(
                new ChartAvatarSeriesPrimitive(chart, filteredTransfers, transferMapRef),
            )
        }

        chartRef.current = chart
        chartRef.current.timeScale().fitContent()

        focusChart(chart, false)

        const handleCrosshairMove: MouseEventHandler<Time> = (param) => {
            const el = crosshairRef.current

            if (!el) {
                return
            }

            const data = areaSeries
                ? (param.seriesData?.get(areaSeries) as AreaData<Time>)
                : (param.seriesData?.get(candleStickSeries) as CandlestickData<Time>)

            if (data && param.point) {
                if (el.children.length === 2) {
                    const date = new Date(Number(data.time) * 1000)

                    const notToday = !isToday(date)
                    const notThisYear = !isThisYear(date)

                    const dateString = date
                        .toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            // show month and year if not current
                            month: notToday ? 'short' : undefined,
                            day: notToday ? 'numeric' : undefined,
                            year: notThisYear ? 'numeric' : undefined,
                        })
                        // remove space before am/pm
                        ?.replace(/\s(?=am|pm)/i, '')

                    if ('value' in data) {
                        // area series
                        const value = formatCompactNumber(data.value)
                        el.children[0].textContent = `$${value}`
                        el.children[1].textContent = dateString
                    } else {
                        // candlestick series
                        const open = formatCompactNumber(data.open)
                        const close = formatCompactNumber(data.close)

                        el.children[0].textContent = `$${open} $${close}`
                        el.children[1].textContent = dateString
                    }
                }
                el.style.display = 'flex'

                const width = el.getBoundingClientRect().width

                el.style.transform = `translate(
                    calc(min(var(--sizebox-width) - ${width + 4}px, max(4px, -50% + ${
                    param.point.x
                }px))), 
                    calc(max(4px, -100% - 10px + ${param.point.y}px))`
            } else {
                el.style.display = 'none'
            }
        }

        chart.subscribeCrosshairMove(handleCrosshairMove)

        return () => {
            chart.unsubscribeCrosshairMove(handleCrosshairMove)
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
        filteredTransfers,
        transferMapRef,
    ])

    useLayoutEffect(() => {
        if (chartRef.current) {
            chartRef.current.applyOptions({
                width: containerWidth,
            })
            chartRef.current.timeScale().fitContent()
        }
    }, [containerWidth])

    return (
        <Box height="200" ref={chartContainerRef}>
            <Box absoluteFill zIndex="above" pointerEvents="none">
                <Box
                    horizontal
                    ref={crosshairRef}
                    background="level3"
                    rounded="md"
                    padding="sm"
                    paddingX="md"
                    gap="sm"
                    alignItems="center"
                    whiteSpace="nowrap"
                    position="topLeft"
                >
                    <Text as="span" size="md" color="gray1" fontWeight="medium" />
                    <Text as="span" size="md" color="gray2" />
                </Box>
                {filteredTransfers
                    .map((transfer, index) => ({
                        ...transfer,
                        key: `fake-key-${index}`,
                    }))
                    .map((transfer, index) => (
                        <Box
                            position="absolute"
                            key={`${transfer.key}`}
                            width="x2"
                            height="x2"
                            ref={(ref) => transferMapRef.current.set(index, ref)}
                        >
                            <ChartTransfer transfer={transfer} />
                        </Box>
                    ))}
            </Box>
        </Box>
    )
}

const ChartTransfer = ({ transfer }: { transfer: TokenTransferRollupEvent }) => {
    const { lookupUser } = useUserLookupContext()
    const user = lookupUser(transfer.userId)
    return (
        <Box
            position="absolute"
            rounded="full"
            background="level4"
            style={{
                border: `2px solid ${
                    transfer.isBuy
                        ? vars.color.tone[ToneName.Positive]
                        : vars.color.tone[ToneName.Peach]
                }`,
            }}
            pointerEvents="auto"
            tooltip={
                <Stack background="level3" rounded="sm" padding="sm" gap="sm" border="level4">
                    {user && (
                        <Text fontSize="xs" color="default" fontWeight="strong">
                            {getPrettyDisplayName(user)}
                        </Text>
                    )}
                    <TokenTransferImpl
                        rawAddress={transfer.address}
                        amount={transfer.amount.toString()}
                        isBuy={transfer.isBuy}
                        chainId={transfer.chainId}
                    />
                </Stack>
            }
        >
            <Box style={{ padding: '1px' }}>
                <Avatar size="avatar_xs" userId={transfer.userId} />
            </Box>
        </Box>
    )
}

class ChartAvatarSeriesPrimitive implements ISeriesPrimitive<Time> {
    private readonly transfers: TokenTransferRollupEvent[]
    private readonly chart: IChartApi
    private readonly markers: HTMLElement[] = []
    private readonly transferMapRef: { current: Map<number, HTMLElement | null> }
    constructor(
        chart: IChartApi,
        transfers: TokenTransferRollupEvent[],
        transferMapRef: { current: Map<number, HTMLElement | null> },
    ) {
        this.chart = chart
        this.transfers = transfers
        this.transferMapRef = transferMapRef
    }

    attached(param: SeriesAttachedParameter<Time, SeriesType>): void {}

    detached(): void {}

    updateAllViews(): void {
        if (this.chart.panes().length === 0 || this.chart.panes()[0].getSeries().length === 0) {
            return
        }
        const series = this.chart.panes()[0].getSeries()[0]
        const paneSize = this.chart.paneSize(0)
        const chartRect = this.chart.chartElement().getBoundingClientRect()
        const leftMarginWidth = chartRect.width - paneSize.width

        const toggleVisibility = (refIndex: number, visible: boolean) => {
            const ref = this.transferMapRef.current.get(refIndex)
            if (ref) {
                ref.style.display = visible ? 'block' : 'none'
            }
        }

        for (const [i, transfer] of this.transfers.entries()) {
            const time = (Number(transfer.createdAtEpochMs) / 1000) as UTCTimestamp
            const index = this.chart.timeScale().timeToIndex(time, true)
            if (!index || series.data().length < index) {
                toggleVisibility(i, false)
                continue
            }

            const dataPoint = series.data()[index]
            const price = extractPrice(dataPoint)
            if (!price) {
                toggleVisibility(i, false)
                continue
            }

            const x = this.chart.timeScale().timeToCoordinate(dataPoint.time)
            const y = series.priceToCoordinate(price)
            const ref = this.transferMapRef.current.get(i)
            if (!x || !y) {
                toggleVisibility(i, false)
                continue
            }

            toggleVisibility(i, true)
            if (ref) {
                ref.style.left = leftMarginWidth + x - 10 + 'px'
                ref.style.top = y - 10 + 'px'
            }
        }
    }
    applyOptions(): void {}
}

function extractPrice(dataPoint: unknown): number | undefined {
    const hasCandleData = (
        data: unknown,
    ): data is {
        open: number
        close: number
        time: UTCTimestamp
    } => {
        return (
            typeof data === 'object' &&
            data !== null &&
            'open' in data &&
            data.open !== null &&
            typeof data.open === 'number'
        )
    }
    const hasValue = (
        data: unknown,
    ): data is {
        value: number
        time: UTCTimestamp
    } => {
        return (
            typeof data === 'object' &&
            data !== null &&
            'value' in data &&
            data.value !== null &&
            typeof data.value === 'number'
        )
    }
    if (hasValue(dataPoint)) {
        return dataPoint.value
    } else if (hasCandleData(dataPoint)) {
        return (dataPoint.open + dataPoint.close) / 2
    }
    return undefined
}
