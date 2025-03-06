import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TickerAttachment } from '@river-build/sdk'
import {
    AreaSeries,
    CandlestickSeries,
    ColorType,
    IChartApi,
    ISeriesPrimitive,
    SeriesAttachedParameter,
    SeriesType,
    Time,
    UTCTimestamp,
    createChart,
} from 'lightweight-charts'
import { zip } from 'lodash'
import { useInView } from 'react-intersection-observer'
import { useMyUserId, useUserLookupContext } from 'use-towns-client'
import { ToneName, themes } from 'ui/styles/themes'
import { Box, Button, Dropdown, Icon, IconButton, Pill, SizeBox, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useStore } from 'store/store'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { formatCompactNumber } from '@components/Web3/Trading/tradingUtils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { TokenIcon } from '@components/Web3/Trading/ui/TokenIcon'
import { TokenPrice } from '@components/Web3/Trading/ui/TokenPrice'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { TickerThreadContext } from '@components/MessageThread/TickerThreadContext'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useTokenBalance } from '@components/Web3/Trading/useTokenBalance'
import { formatUnits } from 'hooks/useBalance'
import {
    TokenTransferRollupEvent,
    useTradingContext,
} from '@components/Web3/Trading/TradingContextProvider'
import { Avatar } from '@components/Avatar/Avatar'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { vars } from 'ui/styles/vars.css'
import { TokenTransferImpl } from '@components/MessageTimeIineItem/items/TokenTransfer'
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

export const TradingChartAttachment = (props: {
    attachment: TickerAttachment
    eventId: string | undefined
}) => {
    const { attachment, eventId } = props
    const { ref, inView } = useInView({
        rootMargin: '10px 0px',
    })
    const { openPanel } = usePanelActions()
    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const remappedChain =
        attachment.chainId === '1151111081099710' ? 'solana-mainnet' : attachment.chainId
    const { onOpenMessageThread } = useOpenMessageThread()

    const isTradeThreadContext = useContext(TickerThreadContext) !== undefined
    const timelineContext = useContext(MessageTimelineContext)

    const onTradeClick = useCallback(
        (mode: 'buy' | 'sell') => {
            // if the user is not in a space, open the trade panel
            // for now, we don't support threaded trading in DMs
            if (eventId && timelineContext?.spaceId) {
                onOpenMessageThread(eventId)
            } else {
                openPanel(CHANNEL_INFO_PARAMS.TRADE_PANEL, {
                    mode,
                    tokenAddress: attachment.address,
                    chainId: remappedChain,
                })
            }
        },
        [
            eventId,
            onOpenMessageThread,
            openPanel,
            attachment.address,
            remappedChain,
            timelineContext,
        ],
    )

    const { containerWidth } = useSizeContext()

    return (
        <Stack
            gap="paragraph"
            rounded="md"
            style={{
                width: 550,
                maxWidth: containerWidth - 80,
            }}
            background="level2"
            ref={ref}
            overflow="hidden"
            paddingBottom="md"
        >
            <TradingChart
                address={props.attachment.address}
                chainId={remappedChain}
                disabled={!inView}
            />
            {!isTradeThreadContext && (
                <Stack horizontal paddingX paddingY="none" gap="sm">
                    <Button
                        grow
                        size="button_x5"
                        tone="level3"
                        rounded="full"
                        color="cta1"
                        onClick={() => onTradeClick('buy')}
                    >
                        Buy
                    </Button>
                    <Button
                        grow
                        size="button_x5"
                        tone="level3"
                        rounded="full"
                        color="negative"
                        onClick={() => onTradeClick('sell')}
                    >
                        Sell
                    </Button>
                </Stack>
            )}
        </Stack>
    )
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

    const [isFocused, setIsFocused] = useState(false)

    const [isExpanded, setIsExpanded] = useState(false)

    const onToggleExpanded = useCallback(() => {
        setIsExpanded((e) => !e)
    }, [])

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
                        <Stack horizontal={isTradingThreadContext} gap="paragraph">
                            <Stack horizontal gap="sm" alignItems="center" insetY="xxs">
                                <TokenIcon
                                    asset={{
                                        imageUrl: coinData.token.info.imageThumbUrl ?? '',
                                        chain: chainId,
                                    }}
                                />
                                <Box maxWidth="200" overflow="hidden" paddingY="xs" gap="sm">
                                    <Text
                                        truncate
                                        maxWidth="150"
                                        fontSize="lg"
                                        fontWeight="strong"
                                        textTransform="uppercase"
                                    >
                                        {coinData.token.name}
                                    </Text>
                                    <ClipboardCopy
                                        maxWidth="100"
                                        color="gray2"
                                        fontSize="sm"
                                        gap="xs"
                                        clipboardContent={address}
                                        label={address}
                                    />
                                </Box>
                            </Stack>
                            <Stack horizontal grow gap="sm">
                                <Stack
                                    grow
                                    horizontal={!isTradingThreadContext}
                                    gap="sm"
                                    alignItems="end"
                                >
                                    <TokenPrice fontWeight="strong" fontSize="lg" before="$">
                                        {coinData.priceUSD}
                                    </TokenPrice>
                                    <Stack horizontal gap="sm" alignItems="end">
                                        <TickerChangeIndicator change={Number(coinData.change24)} />
                                        {!isTradingThreadContext && (
                                            <Text color="gray2" size="sm">
                                                Past day
                                            </Text>
                                        )}
                                    </Stack>
                                </Stack>
                                {isTradingThreadContext && (
                                    <Stack centerContent>
                                        <IconButton
                                            style={{
                                                transform: !isExpanded ? 'none' : 'rotate(180deg)',
                                            }}
                                            icon="arrowDown"
                                            color="default"
                                            onClick={onToggleExpanded}
                                        />
                                    </Stack>
                                )}
                            </Stack>
                        </Stack>
                        {(!isTradingThreadContext || isExpanded) && (
                            <Stack grow horizontal gap="sm" color="gray2" flexWrap="wrap">
                                {balance > 0n && coinData && (
                                    <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                        <Stack
                                            horizontal
                                            gap="xxs"
                                            alignItems="center"
                                            color="default"
                                        >
                                            <Icon type="wallet" size="square_xs" />
                                            <Text fontSize="sm">
                                                {formatCompactNumber(
                                                    Number(
                                                        formatUnits(
                                                            balance,
                                                            coinData.token.decimals,
                                                        ),
                                                    ),
                                                )}
                                            </Text>
                                        </Stack>
                                    </Pill>
                                )}
                                {tradingUserIds.length > 0 && (
                                    <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                        <TradingUserIds userIds={tradingUserIds} />
                                    </Pill>
                                )}
                                {/* 
                            `codexResponse.marketCap` is actually not the market cap, but the FDV.
                            This is a bit confusing, but it's how the API is.
                            Market cap is `codexResponse.token.info.circulatingSupply * codexResponse.priceUSD`
                            (&#8201; is "thin space")
                            */}
                                <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                    <Text fontSize="sm">
                                        LIQ&#8201;${formatCompactNumber(Number(coinData.liquidity))}
                                    </Text>
                                </Pill>
                                <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                    <Text fontSize="sm">
                                        VOL&#8201;${formatCompactNumber(Number(coinData.volume24))}
                                    </Text>
                                </Pill>
                                <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                    <Text fontSize="sm">
                                        MCAP&#8201; $
                                        {formatCompactNumber(
                                            Number(coinData.token.info.circulatingSupply) *
                                                Number(coinData.priceUSD),
                                        )}
                                    </Text>
                                </Pill>
                                <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                    <Text fontSize="sm">
                                        HDLRS&#8201;{formatCompactNumber(coinData.holders)}
                                    </Text>
                                </Pill>
                                <Pill background="level3" color="inherit" whiteSpace="nowrap">
                                    <Text fontSize="sm">
                                        FDV&#8201;${formatCompactNumber(Number(coinData.marketCap))}
                                    </Text>
                                </Pill>
                            </Stack>
                        )}
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
    transfers: TokenTransferRollupEvent[]
}) => {
    const { isFocused, data, chartType, timeframe, transfers } = props

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
            areaSeries.attachPrimitive(
                new ChartAvatarSeriesPrimitive(chart, filteredTransfers, transferMapRef),
            )
        } else {
            const candleStickSeries = chart.addSeries(CandlestickSeries, {})
            const formattedData = zip(data.t, data.o, data.h, data.l, data.c).map(
                ([time, open, high, low, close]) => {
                    return { time: time as UTCTimestamp, open, high, low, close }
                },
            )
            candleStickSeries.setData(formattedData)
            candleStickSeries.attachPrimitive(
                new ChartAvatarSeriesPrimitive(chart, filteredTransfers, transferMapRef),
            )
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

    useLayoutEffect(() => {
        if (chartRef.current) {
            focusChart(chartRef.current, isFocused)
        }
    }, [isFocused, focusChart])

    return (
        <Box height="200" ref={chartContainerRef}>
            <Box absoluteFill zIndex="above" pointerEvents="none">
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
                        : vars.color.tone[ToneName.Negative]
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

const TickerChangeIndicator = ({ change }: { change: number }) => (
    <Box
        horizontal
        alignItems="center"
        gap="xs"
        paddingX="sm"
        paddingY="xs"
        rounded="md"
        insetBottom="xxs"
        background={change > 0 ? 'positiveSubtle' : 'negativeSubtle'}
    >
        <Icon
            insetY="xxs"
            size="square_xxs"
            type={change > 0 ? 'arrowSmallUp' : 'arrowSmallDown'}
        />
        <Text fontWeight="strong" size="sm" color={change > 0 ? 'greenBlue' : 'error'}>
            {Math.abs(change).toFixed(2)}%
        </Text>
    </Box>
)

const TradingUserIds = ({ userIds }: { userIds: string[] }) => {
    const { lookupUser } = useUserLookupContext()
    const myUserId = useMyUserId()

    const summaryText = useMemo(() => {
        if (userIds.length === 0) {
            return ''
        }
        const getPrettyDisplayNameOrYou = (userId: string) => {
            if (userId === myUserId) {
                return 'you'
            }
            return getPrettyDisplayName(lookupUser(userId))
        }
        if (userIds.length === 1) {
            return getPrettyDisplayNameOrYou(userIds[0]) + ' traded'
        }
        if (userIds.length === 2) {
            return (
                getPrettyDisplayNameOrYou(userIds[0]) +
                ' and ' +
                getPrettyDisplayNameOrYou(userIds[1]) +
                ' traded'
            )
        }
        const prefix =
            getPrettyDisplayNameOrYou(userIds[0]) + ', ' + getPrettyDisplayNameOrYou(userIds[1])
        return userIds.length == 3
            ? prefix + ' and one other traded'
            : prefix + ' and ' + (userIds.length - 2) + ' others traded'
    }, [lookupUser, userIds, myUserId])

    return (
        <Stack horizontal gap="xs" alignItems="center" paddingLeft="sm">
            <Stack horizontal gap="xs">
                {userIds.slice(0, 3).map((userId) => (
                    <Box insetLeft="sm" paddingLeft="xs" key={userId}>
                        <Box border="faint" rounded="full" zIndex="above">
                            <Avatar size="avatar_xs" userId={userId} />
                        </Box>
                    </Box>
                ))}
            </Stack>
            <Text fontSize="sm" color="default">
                {summaryText}
            </Text>
        </Stack>
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
