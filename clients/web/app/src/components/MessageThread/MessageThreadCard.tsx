import {
    ChannelMessageMissingEvent,
    EventStatus,
    RiverTimelineEvent,
    TimelineEvent,
    isDefined,
} from '@river-build/sdk'
import React, { PropsWithChildren, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { firstBy } from 'thenby'
import {
    Channel,
    LookupUser,
    useMyProfile,
    useTimelineThread,
    useUserLookupContext,
} from 'use-towns-client'
import { FullScreenMedia } from '@components/FullScreenMedia/FullScreenMedia'
import { Box, Paragraph, Stack } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { QUERY_PARAMS } from 'routes'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { MessageThread } from './MessageThreadComponent'

export const MessageThreadCard = (props: {
    userId: string
    channelLabel: string
    parentId: string
    channelId: string
    spaceId: string
    spaceChannels: Channel[]
}) => {
    const { isTouch } = useDevice()
    const { parentId, channelId, channelLabel, spaceId } = props
    const { createLink } = useCreateLink()
    const profile = useMyProfile()
    const { lookupUser } = useUserLookupContext()
    const { threadData, messages } = useTimelineThread(channelId, parentId)
    let parentMessage = threadData?.parentEvent

    if (threadData && !parentMessage) {
        parentMessage = {
            eventId: parentId,
            eventNum: 0n,
            status: EventStatus.RECEIVED,
            latestEventId: parentId,
            latestEventNum: 0n,
            createdAtEpochMs: 0,
            fallbackContent: '',
            isEncrypting: false,
            isLocalPending: false,
            isSendFailed: false,
            isMentioned: false,
            isRedacted: false,
            sender: { id: '' },
            content: {
                kind: RiverTimelineEvent.ChannelMessageMissing,
                eventId: parentId,
            } satisfies ChannelMessageMissingEvent,
        } satisfies TimelineEvent
    }

    const messagesWithParent = useMemo(
        () => (parentMessage ? [parentMessage, ...messages] : []),
        [messages, parentMessage],
    )

    const involvedUsers = useMemo(() => {
        const userIds = messagesWithParent
            .filter((m) => m.content?.kind === RiverTimelineEvent.ChannelMessage)
            .map((m) => m.sender?.id)
            .filter((id) => id)

        return userIds.reduce((users, id) => {
            users[id] = lookupUser(id)
            return users
        }, {} as { [key: string]: LookupUser | undefined })
    }, [lookupUser, messagesWithParent])

    const usernames = useMemo(() => {
        const names = Object.values(involvedUsers)
            .filter(isDefined)
            .map((u) => {
                const isYou = u.userId === profile?.userId
                return isYou ? 'you' : getPrettyDisplayName(u)
            })
            .sort(firstBy((n) => n === 'you'))
        return names.length > 0
            ? names.reduce(
                  (k, c, index, arr) =>
                      k +
                      c +
                      (index === arr.length - 1 ? '' : index === arr.length - 2 ? ' and ' : ', '),
                  '',
              )
            : undefined
    }, [involvedUsers, profile?.userId])

    const [searchParams] = useSearchParams()
    const galleryId = searchParams.get(QUERY_PARAMS.GALLERY_ID)
    const galleryThreadId = searchParams.get(QUERY_PARAMS.GALLERY_THREAD_ID)
    const showGallery = galleryThreadId === parentId || galleryId === parentId

    const timelineProps = useMemo(
        () =>
            ({
                collapsed: true,
                displayAsSimpleList: true,
                align: 'top',
                groupByUser: false,
            } as const),
        [],
    )

    return threadData ? (
        <>
            <Stack gap={{ touch: 'none', default: 'md' }}>
                <Box paddingX={{ touch: 'md', default: 'none' }}>
                    <Paragraph color="default">
                        <Link to={createLink({ spaceId, channelId, threadId: parentId }) ?? `#`}>
                            #{channelLabel.toLocaleLowerCase()}
                        </Link>
                    </Paragraph>

                    {usernames && <Paragraph color="gray2">{usernames}</Paragraph>}
                </Box>
                <Stack
                    elevate={!isTouch}
                    rounded="md"
                    boxShadow="none"
                    position="relative"
                    overflow="hidden"
                >
                    <MessageThread
                        channelId={props.channelId}
                        spaceId={props.spaceId}
                        parentMessage={parentMessage}
                        messages={messagesWithParent}
                        EditorContainer={EditorContainer}
                        threadData={threadData}
                        timelineProps={timelineProps}
                        editorProps={{
                            autoFocus: false,
                            displayButtons: 'always',
                        }}
                    />
                </Stack>
            </Stack>
            {showGallery && <FullScreenMedia events={messagesWithParent} threadId={parentId} />}
        </>
    ) : (
        <></>
    )
}

const EditorContainer = (props: PropsWithChildren) => {
    return (
        <Box paddingTop="none" paddingBottom="md" paddingX={{ default: 'md', touch: 'none' }}>
            {props.children}
        </Box>
    )
}
