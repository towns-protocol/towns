import {
    TickerAttachment,
    TimelineEvent,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river-build/sdk'
import { isEqual } from 'lodash'
import React, { FC, PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import {
    SendMessageOptions,
    TSigner,
    ThreadStatsData,
    useConnectivity,
    useMyProfile,
    useSpaceMembers,
} from 'use-towns-client'
import { getPostedMessageType, trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { TownsEditorContainer } from '@components/RichTextPlate/TownsEditorContainer'
import { useSendTradeTransaction } from '@components/Web3/Trading/hooks/useTradeQuote'
import { QuoteMetaData, QuoteStatus, TradeComponent } from '@components/Web3/Trading/TradeComponent'
import {
    EvmTransactionRequest,
    SolanaTransactionRequest,
} from '@components/Web3/Trading/TradingContextProvider'
import { Box, BoxProps, FancyButton } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useIsChannelReactable } from 'hooks/useIsChannelReactable'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { WalletReady } from 'privy/WalletReady'
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

    const renderSendButton = useCallback(
        (onSend: () => void) => {
            const mode = tradeData?.metaData.mode ?? quoteStatus?.mode
            return getSigner && quoteStatus ? (
                <Box
                    centerContent
                    tooltip={
                        quoteStatus.status === 'error'
                            ? ``
                            : `${mode === 'buy' ? 'Buy' : 'Sell'} ${
                                  tradeData?.metaData.value.value
                              } ${tradeData?.metaData.value.symbol}`
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
            ) : undefined
        },
        [getSigner, isTradingProgress, quoteStatus, tradeData],
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
                    <Box padding="md">
                        <TradeComponent
                            mode="buy"
                            tokenAddress={tickerAttachment.address}
                            chainId={tickerAttachment.chainId}
                            threadInfo={threadInfo}
                            resetRef={resetRef}
                            onQuoteStatusChanged={onQuoteStatusChanged}
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
