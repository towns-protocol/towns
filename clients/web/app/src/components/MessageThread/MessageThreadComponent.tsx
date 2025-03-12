import {
    TickerAttachment,
    TimelineEvent,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river-build/sdk'
import { isEqual } from 'lodash'
import React, {
    FC,
    PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useEvent } from 'react-use-event-hook'
import {
    SendMessageOptions,
    TSigner,
    ThreadStatsData,
    useConnectivity,
    useMyProfile,
    useSpaceMembers,
} from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { getPostedMessageType, trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { TownsEditorContainer } from '@components/RichTextPlate/TownsEditorContainer'
import { useSendTradeTransaction } from '@components/Web3/Trading/hooks/useTradeQuote'
import { QuoteMetaData, QuoteStatus, TradeComponent } from '@components/Web3/Trading/TradeComponent'
import { useTradeSettings } from '@components/Web3/Trading/tradeSettingsStore'
import {
    EvmTransactionRequest,
    SolanaTransactionRequest,
} from '@components/Web3/Trading/TradingContextProvider'
import { Box, BoxProps, FancyButton, Paragraph, Stack, Tooltip } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelReactable } from 'hooks/useIsChannelReactable'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { WalletReady } from 'privy/WalletReady'
import { TokenIcon } from '@components/Web3/Trading/ui/TokenIcon'
import { isTradingChain, tradingChains } from '@components/Web3/Trading/tradingConstants'
import { FadeInBox } from '@components/Transitions'
import { EditSlippageButton } from '@components/Web3/Trading/EditSlippagePopover'
import { formatCompactNumber } from '@components/Web3/Trading/tradingUtils'
import { useTradingWalletBalance } from '@components/Web3/Trading/hooks/useTradingBalance'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { useTokenBalance } from '@components/Web3/Trading/useTokenBalance'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { getTickerAttachment } from './getTickerAttachment'
import { TickerThreadContext } from './TickerThreadContext'

export const MessageThread = (props: {
    threadData: ThreadStatsData
    parentMessage: TimelineEvent | undefined
    messages: TimelineEvent[]
    spaceId: string | undefined
    channelId: string
    MessageContainer?: FC<PropsWithChildren>
    EditorContainer?: FC<PropsWithChildren>
    timelineProps: React.ComponentProps<typeof MessageTimeline>
    editorProps: Partial<React.ComponentProps<typeof ThreadEditor>>
}) => {
    const {
        threadData,
        parentMessage,
        messages,
        spaceId,
        channelId,
        MessageContainer,
        EditorContainer,
        timelineProps,
    } = props

    const messageId = parentMessage?.eventId

    const messagesWithParent = useMemo(() => {
        return parentMessage ? [parentMessage, ...messages] : messages
    }, [messages, parentMessage])

    const { loggedInWalletAddress } = useConnectivity()

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)
    const isDmOrGDM = isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId)
    const { isChannelReactable } = useIsChannelReactable(
        isDmOrGDM ? undefined : spaceId,
        channelId,
        loggedInWalletAddress,
    )

    const imageUploadTitle = isChannelWritable
        ? `Upload to thread`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    const tickerAttachment = useMemo(() => {
        return getTickerAttachment(parentMessage)
    }, [parentMessage])

    const editorProps = {
        spaceId,
        channelId,
        messageId,
        tickerAttachment,
        threadData,
        isChannelWritable,
    }

    const timelineContent = (
        <MessageTimelineWrapper
            spaceId={spaceId}
            channelId={channelId}
            threadParentId={messageId}
            events={messagesWithParent}
            isChannelWritable={isChannelWritable}
            isChannelReactable={isChannelReactable}
        >
            <MessageTimeline {...timelineProps} />
        </MessageTimelineWrapper>
    )

    const editorContent = tickerAttachment ? (
        <WalletReady>
            {({ getSigner }) => (
                <ThreadEditor {...editorProps} {...props.editorProps} getSigner={getSigner} />
            )}
        </WalletReady>
    ) : (
        <ThreadEditor {...editorProps} {...props.editorProps} />
    )

    return (
        <TickerThreadContext.Provider value={tickerAttachment}>
            <MediaDropContextProvider
                title={imageUploadTitle}
                channelId={channelId}
                spaceId={spaceId}
                eventId={messageId}
                key={messageId}
                disableDrop={!isChannelWritable}
            >
                {MessageContainer ? (
                    <MessageContainer>{timelineContent}</MessageContainer>
                ) : (
                    timelineContent
                )}
                {EditorContainer ? (
                    <EditorContainer>{editorContent}</EditorContainer>
                ) : (
                    editorContent
                )}
            </MediaDropContextProvider>
        </TickerThreadContext.Provider>
    )
}

const ThreadEditor = (props: {
    spaceId?: string
    channelId: string
    messageId?: string
    tickerAttachment?: TickerAttachment
    threadData?: ThreadStatsData
    isChannelWritable?: boolean
    getSigner?: () => Promise<TSigner | undefined>
    autoFocus?: boolean
    displayButtons?: 'always' | 'on-focus'
    background?: BoxProps['background']
}) => {
    const {
        channelId,
        getSigner,
        isChannelWritable,
        messageId,
        threadData,
        spaceId,
        tickerAttachment,
        autoFocus,
        displayButtons,
        background,
    } = props
    const { isTouch } = useDevice()
    const userId = useMyProfile()?.userId
    const channels = useSpaceChannels()
    const { memberIds } = useSpaceMembers()

    const [tradeData, setTradeData] = useState<
        | {
              request: EvmTransactionRequest | SolanaTransactionRequest
              metaData: QuoteMetaData
          }
        | undefined
    >(undefined)

    const { sendTradeTransaction: onSendTrade } = useSendTradeTransaction({
        request: tradeData?.request,
        chainId: tickerAttachment?.chainId,
        skipPendingToast: true,
    })

    const { sendReply } = useSendReply(messageId)

    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    const allowEmptyMessage = !!tickerAttachment

    const resetRef = useRef<{ reset: () => void }>({ reset: () => {} })

    const [isTradingProgress, setIsTradingProgress] = useState(false)

    const onSend = useCallback(
        async (value: string, options: SendMessageOptions | undefined) => {
            if (tradeData && onSendTrade && getSigner) {
                setIsTradingProgress(true)
                await onSendTrade?.(getSigner)
                resetRef.current?.reset()
                setIsTradingProgress(false)
                if (options && 'emptyMessage' in options && !!options?.emptyMessage) {
                    return
                }
            }

            trackPostedMessage({
                spaceId,
                channelId,
                messageType: getPostedMessageType(value, {
                    messageType: options?.messageType,
                }),
                threadId: 'threadId',
                canReplyInline: undefined,
                replyToEventId: undefined,
                ...spaceDetailsAnalytics,
            })
            const userIds = threadData?.userIds ?? new Set<string>()
            if (threadData?.parentEvent) {
                userIds.add(threadData.parentEvent.sender.id)
            }
            sendReply(value, channelId, options, userIds)
        },
        [
            channelId,
            getSigner,
            onSendTrade,
            threadData,
            sendReply,
            spaceDetailsAnalytics,
            spaceId,
            tradeData,
        ],
    )

    const [quoteStatus, setQuoteStatus] = useState<QuoteStatus | undefined>(undefined)

    const tradeDataRef = useRef(tradeData)
    tradeDataRef.current = tradeData

    const onQuoteStatusChanged = useEvent((status: QuoteStatus | undefined) => {
        setQuoteStatus(status)
        if (!status) {
            setTradeData(undefined)
            return
        }

        if (status.status === 'ready') {
            if (
                isEqual(tradeDataRef.current?.request, status.data.request) &&
                isEqual(tradeDataRef.current?.metaData, status.data.metaData)
            ) {
                return
            }
            setTradeData(status.data)
        } else {
            setTradeData(undefined)
        }
    })

    const slippage = useTradeSettings((state) => state.slippage)

    const [params] = useSearchParams()
    const [mode, setMode] = useState<'buy' | 'sell'>(() => {
        const mode = params.get('mode')
        return mode === 'buy' ? 'buy' : 'sell'
    })
    useEffect(() => {
        setMode(() => {
            if (tradeData?.metaData) {
                return tradeData.metaData.mode
            }
            if (quoteStatus) {
                return quoteStatus.mode
            }

            const mode = params.get('mode')

            if (mode === 'buy' || mode === 'sell') {
                return mode
            }
            return 'buy'
        })
    }, [params, quoteStatus, tradeData])

    const onModeChanged = useEvent((mode: 'buy' | 'sell') => {
        setMode(mode)
    })

    const renderSendButton = useCallback(
        (onSend: () => void) => {
            return getSigner && quoteStatus && typeof mode === 'string' ? (
                <Stack horizontal gap="sm" alignItems="center">
                    <Box
                        centerContent
                        tooltip={
                            quoteStatus.status === 'error' || !tradeData?.metaData?.value.value ? (
                                ``
                            ) : (
                                <TransactionTooltip
                                    mode={mode}
                                    chainId={tickerAttachment?.chainId ?? ''}
                                    tradeData={tradeData?.metaData}
                                    slippage={slippage}
                                />
                            )
                        }
                        opacity={
                            quoteStatus?.status !== 'ready' || isTradingProgress ? '0.5' : undefined
                        }
                    >
                        <FancyButton
                            compact="x4"
                            gap="xxs"
                            paddingLeft="sm"
                            paddingRight="md"
                            background={mode === 'buy' ? 'positive' : 'negative'}
                            borderRadius="full"
                            icon="lightning"
                            spinner={quoteStatus?.status === 'loading' || isTradingProgress}
                            disabled={quoteStatus?.status !== 'ready' || isTradingProgress}
                            onClick={onSend}
                        >
                            {mode === 'buy' ? 'Buy' : 'Sell'}
                        </FancyButton>
                    </Box>
                </Stack>
            ) : undefined
        },
        [
            getSigner,
            isTradingProgress,
            mode,
            quoteStatus,
            slippage,
            tickerAttachment?.chainId,
            tradeData?.metaData,
        ],
    )

    const renderTradingBottomBar = mode ? (
        <TradingBottomBar
            tokenAddress={tickerAttachment?.address}
            mode={mode}
            chainId={tickerAttachment?.chainId}
        />
    ) : (
        <>nope</>
    )

    const editor = (
        <TownsEditorContainer
            isFullWidthOnTouch
            background={background}
            key={`${messageId}-${isChannelWritable ? '' : '-readonly'}`}
            editable={!!isChannelWritable}
            displayButtons={displayButtons ?? 'on-focus'}
            placeholder={tickerAttachment ? 'Add an optional message...' : 'Reply...'}
            storageId={`${channelId}-${messageId}`}
            threadId={messageId}
            channels={channels}
            spaceMemberIds={memberIds}
            userId={userId}
            allowEmptyMessage={allowEmptyMessage}
            renderSendButton={renderSendButton}
            renderTradingBottomBar={renderTradingBottomBar}
            autoFocus={autoFocus ?? !isTouch}
            threadPreview={threadData?.parentEvent?.fallbackContent}
            onSend={onSend}
        />
    )

    const threadInfo = useMemo(() => {
        return messageId ? { channelId, messageId } : undefined
    }, [channelId, messageId])

    return (
        <>
            {tickerAttachment ? (
                <Box elevate rounded="md">
                    <Box padding="md" paddingBottom="xs">
                        <TradeComponent
                            mode={mode}
                            tokenAddress={tickerAttachment.address}
                            chainId={tickerAttachment.chainId}
                            threadInfo={threadInfo}
                            resetRef={resetRef}
                            onQuoteStatusChanged={onQuoteStatusChanged}
                            onModeChanged={onModeChanged}
                        />
                    </Box>
                    <Box>{editor}</Box>
                </Box>
            ) : (
                editor
            )}
        </>
    )
}

const TransactionTooltip = (props: {
    mode: 'buy' | 'sell'
    chainId: string
    tradeData: QuoteMetaData
    slippage: number
}) => {
    const { mode, tradeData, slippage } = props

    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const chainId = props.chainId === '1151111081099710' ? 'solana-mainnet' : props.chainId
    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]
    const slippageText = slippage ? `(± ${slippage * 100}%)` : ''

    return (
        <FadeInBox padding="sm">
            <Tooltip background="level2">
                <Stack horizontal padding="sm" gap="sm">
                    <Stack>
                        <Box position="relative" alignSelf="start">
                            <TokenIcon
                                asset={{
                                    imageUrl: tradeData.value.icon ?? '',
                                    chain: chainConfig.chainId,
                                }}
                            />
                        </Box>
                    </Stack>
                    <Stack gap="sm">
                        <Paragraph
                            color={mode === 'buy' ? 'positive' : 'peach'}
                            whiteSpace="nowrap"
                        >
                            {mode === 'buy' ? 'Buy' : 'Sell'}{' '}
                            {formatCompactNumber(Number(tradeData.value.value))}{' '}
                            {tradeData.value.symbol} {mode === 'buy' ? slippageText : ''}
                        </Paragraph>
                        <Paragraph color="gray1">
                            For {formatCompactNumber(Number(tradeData.valueAt.value))}{' '}
                            {tradeData.valueAt.symbol} {mode === 'sell' ? slippageText : ''}
                        </Paragraph>
                    </Stack>
                </Stack>
            </Tooltip>
        </FadeInBox>
    )
}

const TradingBottomBar = (props: {
    tokenAddress?: string
    mode: 'buy' | 'sell'
    chainId?: string
}) => {
    const { mode, chainId, tokenAddress } = props

    if (!chainId) {
        return
    }

    return (
        <Stack horizontal gap="sm" alignItems="center">
            {mode === 'buy' ? (
                <TradingWalletBalance chainId={chainId} />
            ) : tokenAddress ? (
                <TokenBalance chainId={chainId} tokenAddress={tokenAddress} />
            ) : null}
            <EditSlippageButton />
        </Stack>
    )
}

const TradingWalletBalance = (props: { chainId: string }) => {
    const { chainId } = props
    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]
    const { walletBalance } = useTradingWalletBalance({ chainId })
    return (
        <Box>
            <TokenPrice
                value={formatUnitsToFixedLength(walletBalance, chainConfig.decimals, 2)}
                symbol={chainConfig.tokenSymbol}
            />
        </Box>
    )
}

const TokenBalance = (props: { chainId: string; tokenAddress: string }) => {
    const { chainId, tokenAddress } = props
    const tokenBalance = useTokenBalance(chainId, tokenAddress)
    const { data: tokenData } = useCoinData({ address: tokenAddress, chain: chainId })

    return tokenData ? (
        <Box>
            <TokenPrice
                value={formatUnitsToFixedLength(tokenBalance, tokenData.token.decimals, 2)}
                symbol={tokenData.token.symbol}
            />
        </Box>
    ) : null
}

const TokenPrice = (props: { value: string; symbol: string }) => {
    const { value, symbol } = props
    return (
        <AnimatePresence>
            {!!value && (
                <FadeInBox
                    background="lightHover"
                    paddingX="paragraph"
                    paddingY="sm"
                    borderRadius="md"
                    height="height_md"
                    justifyContent="center"
                >
                    <Paragraph size="sm" fontWeight="medium" color="gray2">
                        {value.startsWith('~') ? value : formatCompactNumber(Number(value))}{' '}
                        {symbol}
                    </Paragraph>
                </FadeInBox>
            )}
        </AnimatePresence>
    )
}
