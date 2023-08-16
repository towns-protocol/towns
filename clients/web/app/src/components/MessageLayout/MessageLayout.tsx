import { format, formatDistance } from 'date-fns'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MessageReactions, RoomIdentifier, ThreadStats } from 'use-zion-client'
import { Link } from 'react-router-dom'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { Reactions } from '@components/Reactions/Reactions'
import { RepliesButton } from '@components/Replies/MessageReplies'
import { Avatar, Box, BoxProps, ButtonText, Icon, Paragraph, Stack, Text } from '@ui'
import { useHover } from 'hooks/useHover'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { useHandleReaction } from 'hooks/useReactions'
import { AvatarProps } from 'ui/components/Avatar/Avatar'
import { AvatarAtoms } from 'ui/components/Avatar/Avatar.css'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useFocused } from 'hooks/useFocused'
import { ZRoomMessageRedactedEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { MessageContextMenu } from './MessageContextMenu'
import { MessageModalSheet } from './MessageModalSheet'

type Props = {
    userId?: string | null
    senderId?: string
    avatarSize?: AvatarAtoms['size']
    name: string
    displayContext?: 'single' | 'head' | 'tail'
    messageSourceAnnotation?: string
    messageBody?: string
    reactions?: MessageReactions
    replies?: ThreadStats
    canReply?: boolean
    timestamp?: number
    editing?: boolean
    editable?: boolean
    eventId?: string
    highlight?: boolean
    selectable?: boolean
    listView?: boolean
    channelId?: RoomIdentifier
    spaceId?: RoomIdentifier
    children?: React.ReactNode
    onReaction?: ReturnType<typeof useHandleReaction> | null
    relativeDate?: boolean
    rounded?: BoxProps['rounded']
    padding?: BoxProps['padding']
    background?: BoxProps['background']
    channelLabel?: string
    isChannelWritable?: boolean
} & BoxProps

export type MessageLayoutProps = Props

export const MessageLayout = (props: Props) => {
    const {
        userId,
        senderId,
        eventId,
        avatarSize = 'avatar_md',
        name,
        messageSourceAnnotation,
        channelId,
        spaceId,
        editable: isEditable,
        editing: isEditing,
        highlight: isHighlight,
        isChannelWritable = true,
        selectable: isSelectable,
        listView: isListView,
        displayContext = 'single',
        onReaction,
        reactions,
        relativeDate: isRelativeDate,
        replies,
        canReply,
        timestamp,
        children,
        ...boxProps
    } = props

    const ref = useRef<HTMLDivElement>(null)
    const { isTouch } = useDevice()

    const { isHover, onMouseEnter } = useHover(ref)
    const { isFocused } = useFocused(ref)

    const [isModalSheetVisible, setIsModalSheetVisible] = useState(false)

    const isActive = isTouch ? isFocused : isHover

    const date = timestamp
        ? isRelativeDate
            ? `${formatDistance(timestamp, Date.now(), {
                  addSuffix: true,
              })}`
            : format(timestamp, 'h:mm a')
        : undefined

    const backgroundProps = useHighlightBackground(isHighlight)

    const onClick = useCallback(() => {
        setIsModalSheetVisible(true)
    }, [setIsModalSheetVisible])

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)
    const onDoubleClick = useCallback(() => {
        if (canReply && eventId) {
            onOpenMessageThread(eventId)
        }
    }, [canReply, onOpenMessageThread, eventId])

    const { createLink } = useCreateLink()
    const profileLink = createLink({ profileId: senderId })

    return (
        <Stack
            horizontal
            ref={ref}
            onMouseEnter={onMouseEnter}
            {...boxProps}
            hoverable={isSelectable}
            elevate={isEditing || isHighlight}
            hoverActive={isEditing || isHighlight}
            background="level1"
            {...backgroundProps}
            tabIndex={0}
            onDoubleClick={!isTouch && canReply ? onDoubleClick : undefined}
        >
            {/* left / avatar gutter */}
            {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
            <Box minWidth={isTouch ? 'x6' : 'x8'}>
                {displayContext !== 'tail' ? (
                    senderId ? (
                        <AvatarComponent
                            size={avatarSize}
                            insetY="xxs"
                            userId={senderId}
                            link={profileLink}
                            tooltip={isTouch ? undefined : <ProfileHoverCard userId={senderId} />}
                        />
                    ) : (
                        <></>
                    )
                ) : (
                    <>
                        {!isRelativeDate && isActive && (
                            <Box paddingTop="xxs" insetBottom="xxs">
                                <Paragraph truncate size="sm" color="gray2">
                                    {date}
                                </Paragraph>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* right / main content */}
            <Stack grow gap="md" position="relative">
                {/* name & date top row */}
                {displayContext !== 'tail' && (
                    <Stack horizontal grow gap="sm" height="height_sm" alignItems="end">
                        {/* display name with tooltip */}
                        {name && senderId && (
                            <Box
                                tooltip={
                                    isTouch ? undefined : <ProfileHoverCard userId={senderId} />
                                }
                            >
                                <Link to={`profile/${senderId}`}>
                                    <Text truncate fontSize="md" color="gray1" as="span">
                                        {name}&nbsp;
                                    </Text>
                                </Link>
                            </Box>
                        )}
                        {props.channelLabel ? (
                            <Text color="gray2">{`#${props.channelLabel}`}</Text>
                        ) : (
                            ``
                        )}

                        {/* date, alignment tbc depending on context */}
                        {date && (
                            <Text
                                grow
                                shrink={false}
                                fontSize="sm"
                                color="gray2"
                                as="span"
                                textAlign={isListView ? 'right' : 'left'}
                            >
                                {date}
                            </Text>
                        )}
                    </Stack>
                )}
                <Stack gap="md">
                    <Stack
                        grow
                        fontSize="md"
                        color="default"
                        gap="md"
                        onClick={isTouch && isSelectable ? onClick : undefined}
                    >
                        {children}
                    </Stack>

                    {/* channel */}
                    {messageSourceAnnotation && (
                        <ButtonText color="gray2" as="span">
                            {messageSourceAnnotation}
                        </ButtonText>
                    )}

                    {reactions && onReaction ? (
                        <Stack horizontal>
                            <Reactions
                                userId={userId}
                                parentId={eventId}
                                reactions={reactions}
                                onReaction={onReaction}
                            />
                        </Stack>
                    ) : null}

                    {replies && eventId && (
                        <Stack horizontal>
                            <RepliesButton eventId={eventId} threadStats={replies} />
                        </Stack>
                    )}
                </Stack>
                {!isTouch &&
                    isChannelWritable &&
                    spaceId &&
                    channelId &&
                    eventId &&
                    isActive &&
                    !isEditing &&
                    isSelectable && (
                        <MessageContextMenu
                            canReply={canReply}
                            canReact={!!onReaction}
                            channelId={channelId}
                            spaceId={spaceId}
                            eventId={eventId}
                            canEdit={isEditable}
                        />
                    )}
            </Stack>

            {isModalSheetVisible &&
                isTouch &&
                isChannelWritable &&
                spaceId &&
                channelId &&
                eventId &&
                isSelectable && (
                    <MessageModalSheet
                        canReply={canReply}
                        canReact={!!onReaction}
                        channelId={channelId}
                        spaceId={spaceId}
                        eventId={eventId}
                        canEdit={isEditable}
                        messageBody={props.messageBody}
                        onClose={() => setIsModalSheetVisible(false)}
                    />
                )}
        </Stack>
    )
}

export const RedactedMessageLayout = (props: {
    event: ZRoomMessageRedactedEvent
    replies?: ThreadStats
}) => {
    const { event, replies } = props
    const { isTouch } = useDevice()

    return (
        <Stack horizontal hoverable gap="md" paddingLeft="lg" paddingY="md" background="level1">
            <Box
                centerContent
                rounded="full"
                height={isTouch ? 'x4' : 'x6'}
                width={isTouch ? 'x4' : 'x6'}
                background="level2"
            >
                <Icon type="delete" color="gray2" padding="xs" />
            </Box>
            <Box>
                <Stack gap>
                    <Box
                        padding
                        horizontal
                        border
                        gap="sm"
                        alignItems="center"
                        color="gray2"
                        background="level1"
                        height="x6"
                        rounded="sm"
                    >
                        <Paragraph>This message was deleted</Paragraph>
                    </Box>
                    {replies && event.eventId && (
                        <Box justifySelf="start">
                            <RepliesButton eventId={event.eventId} threadStats={replies} />
                        </Box>
                    )}
                </Stack>
            </Box>
        </Stack>
    )
}

const useHighlightBackground = (isHighlight?: boolean) => {
    const [isHighlightActive, setHighlightActive] = useState(isHighlight)

    const background = isHighlightActive ? ('level3' as const) : undefined

    useEffect(() => {
        if (isHighlightActive) {
            const timeout = setTimeout(() => {
                setHighlightActive(false)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    })

    const [backgroundTransitionEnabled, setBackgroundTransitionEnabled] = useState(isHighlight)

    const onTransitionEnd = isHighlight
        ? () => {
              setBackgroundTransitionEnabled(false)
          }
        : undefined

    const style = backgroundTransitionEnabled ? { transition: `background 1s ease` } : undefined

    return background ? { onTransitionEnd, style, background } : { onTransitionEnd, style }
}

const AvatarComponent = (props: AvatarProps & { userId?: string; link?: string }) => {
    const { userId, link, ...avatarProps } = props
    if (userId && link) {
        return <ActiveAvatar {...avatarProps} userId={userId} link={link} />
    }
    return <Avatar {...avatarProps} userId={userId} />
}

const ActiveAvatar = (props: AvatarProps & { userId: string; link: string }) => {
    const { userId, ...avatarProps } = props
    return (
        <Link to={props.link}>
            <Avatar userId={userId} {...avatarProps} />
        </Link>
    )
}
