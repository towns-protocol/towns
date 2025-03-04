import React, { useCallback, useMemo, useState } from 'react'
import {
    SendMessageOptions,
    TSigner,
    ThreadStatsData,
    useChannelContext,
    useChannelData,
    useConnectivity,
    useMyProfile,
    useSpaceMembers,
    useTimelineThread,
} from 'use-towns-client'
import { useLocation } from 'react-router'
import { TickerAttachment } from '@river-build/sdk'
import { MessageTimeline } from '@components/MessageTimeline/MessageTimeline'
import { MessageTimelineWrapper } from '@components/MessageTimeline/MessageTimelineContext'
import { TownsEditorContainer } from '@components/RichTextPlate/TownsEditorContainer'
import { Box, FancyButton, Paragraph, Stack } from '@ui'
import { useIsChannelWritable } from 'hooks/useIsChannelWritable'
import { useSendReply } from 'hooks/useSendReply'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'
import { useDevice } from 'hooks/useDevice'
import { Panel } from '@components/Panel/Panel'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { useIsChannelReactable } from 'hooks/useIsChannelReactable'
import { getPostedMessageType, trackPostedMessage } from '@components/Analytics/postedMessage'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { QuoteMetaData, TradeComponent } from '@components/Web3/Trading/TradeComponent'
import { useOnPressTrade } from '@components/Web3/Trading/hooks/useTradeQuote'
import {
    EvmTransactionRequest,
    SolanaTransactionRequest,
} from '@components/Web3/Trading/TradingContextProvider'
import { WalletReady } from 'privy/WalletReady'
import { getTickerAttachment } from './getTickerAttachment'
import { TickerThreadContext } from './TickerThreadContext'

type Props = {
    messageId: string
    highlightId?: string
    parentRoute?: string
}
export const MessageThreadPanel = (props: Props) => {
    const { channelId, spaceId } = useChannelContext()

    const channelLabel = useChannelData().channel?.label
    const { messageId } = props
    const { parent, messages } = useTimelineThread(channelId, messageId)
    const parentMessage = parent?.parentEvent

    const messagesWithParent = useMemo(() => {
        return parentMessage ? [parentMessage, ...messages] : messages
    }, [messages, parentMessage])

    const tickerAttachment = useMemo(() => {
        return getTickerAttachment(parentMessage)
    }, [parentMessage])

    const { loggedInWalletAddress } = useConnectivity()

    const { isTouch } = useDevice()

    const location = useLocation()

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? messages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [location.hash, messages])

    const panelLabel = (
        <Paragraph truncate>
            {tickerAttachment ? (
                <span className={atoms({ color: 'default' })}>Trading </span>
            ) : null}
            Thread{' '}
            {channelLabel ? (
                <>
                    in <span className={atoms({ color: 'default' })}>#{channelLabel}</span>
                </>
            ) : null}
        </Paragraph>
    )

    const { isChannelWritable } = useIsChannelWritable(spaceId, channelId, loggedInWalletAddress)
    const { isChannelReactable } = useIsChannelReactable(spaceId, channelId, loggedInWalletAddress)

    const imageUploadTitle = isChannelWritable
        ? `Upload to thread`
        : isChannelWritable === false
        ? `You don't have permission to send media to this channel`
        : `Loading permissions`

    const editorProps = {
        spaceId,
        channelId,
        messageId,
        tickerAttachment,
        parent,
        isChannelWritable,
    }

    const editor = tickerAttachment ? (
        <WalletReady>
            {({ getSigner }) => <EditorWithSigner {...editorProps} getSigner={getSigner} />}
        </WalletReady>
    ) : (
        <EditorWithSigner {...editorProps} />
    )

    return (
        <Panel label={panelLabel} padding="none" gap="none" parentRoute={props.parentRoute}>
            <TickerThreadContext.Provider value={tickerAttachment}>
                <MediaDropContextProvider
                    title={imageUploadTitle}
                    channelId={channelId}
                    spaceId={spaceId}
                    eventId={messageId}
                    key={messageId}
                    disableDrop={!isChannelWritable}
                >
                    <Stack
                        grow
                        position="relative"
                        overflow="hidden"
                        justifyContent={{ default: 'start', touch: 'end' }}
                        width="100%"
                    >
                        <MessageTimelineWrapper
                            spaceId={spaceId}
                            channelId={channelId}
                            threadParentId={messageId}
                            events={messagesWithParent}
                            isChannelWritable={isChannelWritable}
                            isChannelReactable={isChannelReactable}
                        >
                            <MessageTimeline
                                align="bottom"
                                highlightId={highlightId}
                                groupByUser={false}
                            />
                        </MessageTimelineWrapper>
                    </Stack>
                    {isChannelWritable && (
                        <Box
                            paddingX={{ default: 'md', touch: 'none' }}
                            paddingBottom={{ default: 'md', touch: 'none' }}
                            paddingTop={{ default: 'none', touch: 'none' }}
                            bottom={isTouch ? 'sm' : 'none'}
                            // this id is added to both MessageThreadPanel.tsx and Channel.tsx
                            // to allow for the MessageEditor to be attached in the same
                            // container via React.createPortal
                            id="editor-container"
                        >
                            {editor}
                        </Box>
                    )}
                </MediaDropContextProvider>
            </TickerThreadContext.Provider>
        </Panel>
    )
}

const EditorWithSigner = (props: {
    spaceId?: string
    channelId: string
    messageId?: string
    tickerAttachment?: TickerAttachment
    parent?: ThreadStatsData
    isChannelWritable?: boolean
    getSigner?: () => Promise<TSigner | undefined>
}) => {
    const {
        channelId,
        getSigner,
        isChannelWritable,
        messageId,
        parent,
        spaceId,
        tickerAttachment,
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

    const { onPressTrade } = useOnPressTrade({
        request: tradeData?.request,
        chainId: tickerAttachment?.chainId,
    })

    const { sendReply } = useSendReply(messageId)

    const spaceDetailsAnalytics = useGatherSpaceDetailsAnalytics({
        spaceId,
        channelId,
    })

    const onSend = useCallback(
        async (value: string, options: SendMessageOptions | undefined) => {
            if (tradeData && onPressTrade && getSigner) {
                await onPressTrade?.(getSigner)
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
            const userIds = parent?.userIds ?? new Set<string>()
            if (parent?.parentEvent) {
                userIds.add(parent.parentEvent.sender.id)
            }
            sendReply(value, channelId, options, userIds)
        },
        [
            channelId,
            getSigner,
            onPressTrade,
            parent,
            sendReply,
            spaceDetailsAnalytics,
            spaceId,
            tradeData,
        ],
    )

    const editor = (
        <TownsEditorContainer
            isFullWidthOnTouch
            background={tickerAttachment ? 'level1' : undefined}
            key={`${messageId}-${isChannelWritable ? '' : '-readonly'}`}
            autoFocus={!isTouch}
            editable={!!isChannelWritable}
            displayButtons="on-focus"
            placeholder={tickerAttachment ? 'Add an optional message...' : 'Reply...'}
            storageId={`${channelId}-${messageId}`}
            threadId={messageId}
            channels={channels}
            spaceMemberIds={memberIds}
            userId={userId}
            renderSendButton={(onSend) => {
                return getSigner && tradeData && onPressTrade ? (
                    <Box
                        centerContent
                        tooltip={`${tradeData?.metaData.mode === 'buy' ? 'Buy' : 'Sell'} ${
                            tradeData?.metaData.value.value
                        } ${tradeData?.metaData.value.symbol}`}
                    >
                        <FancyButton
                            compact="x4"
                            gap="xxs"
                            paddingLeft="sm"
                            paddingRight="md"
                            background={
                                tradeData?.metaData.mode === 'buy' ? 'positive' : 'negative'
                            }
                            borderRadius="full"
                            icon="lightning"
                            onClick={onSend}
                        >
                            {tradeData?.metaData.mode === 'buy' ? 'Buy' : 'Sell'}
                        </FancyButton>
                    </Box>
                ) : undefined
            }}
            onSend={onSend}
        />
    )

    return (
        <>
            {tickerAttachment ? (
                <Box elevate background="readability" rounded="md">
                    <Box padding="md">
                        <TradeComponent
                            mode="buy"
                            tokenAddress={tickerAttachment.address}
                            chainId={tickerAttachment.chainId}
                            onQuoteChanged={(request, metaData) => {
                                setTradeData(
                                    request && metaData ? { request, metaData } : undefined,
                                )
                            }}
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
