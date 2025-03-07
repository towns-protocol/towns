import React, { PropsWithChildren, useMemo } from 'react'
import { useLocation } from 'react-router'
import { useChannelContext, useChannelData, useTimelineThread } from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { Box, Paragraph, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { atoms } from 'ui/styles/atoms.css'
import { getTickerAttachment } from './getTickerAttachment'
import { MessageThread } from './MessageThreadComponent'

type Props = {
    messageId: string
    highlightId?: string
    parentRoute?: string
}

export const MessageThreadPanel = (props: Props) => {
    const { messageId } = props
    const { channelId, spaceId } = useChannelContext()
    const { threadData, messages } = useTimelineThread(channelId, messageId)

    const location = useLocation()

    const highlightId = useMemo(() => {
        const eventHash = location.hash?.replace(/^#/, '')
        return eventHash?.match(/^[a-z0-9_-]{16,128}/i)
            ? messages.some((m) => m.eventId === eventHash)
                ? eventHash
                : undefined
            : undefined
    }, [location.hash, messages])

    const channelLabel = useChannelData().channel?.label
    const parentEvent = threadData?.parentEvent
    const tickerAttachment = useMemo(() => {
        return getTickerAttachment(parentEvent)
    }, [parentEvent])

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

    const timelineProps = useMemo(
        () => ({
            align: 'bottom' as const,
            groupByUser: tickerAttachment ? true : undefined,
            highlightId,
        }),
        [highlightId, tickerAttachment],
    )

    const editorProps = useMemo(
        () => ({
            autoFocus: false,
            background: tickerAttachment ? ('level1' as const) : undefined,
            displayButtons: 'always' as const,
        }),
        [tickerAttachment],
    )

    return (
        <Panel label={panelLabel} padding="none" gap="none" parentRoute={props.parentRoute}>
            {threadData ? (
                <MessageThread
                    threadData={threadData}
                    spaceId={spaceId}
                    channelId={channelId}
                    parentMessage={parentEvent}
                    messages={messages}
                    MessageContainer={PanelMessageContainer}
                    EditorContainer={PanelEditorContainer}
                    timelineProps={timelineProps}
                    editorProps={editorProps}
                />
            ) : (
                <></>
            )}
        </Panel>
    )
}

const PanelMessageContainer = (props: PropsWithChildren) => {
    return (
        <Stack
            grow
            position="relative"
            overflow="hidden"
            justifyContent={{ default: 'start', touch: 'end' }}
            width="100%"
        >
            {props.children}
        </Stack>
    )
}

const PanelEditorContainer = (props: PropsWithChildren) => {
    const { isTouch } = useDevice()
    return (
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
            {props.children}
        </Box>
    )
}
