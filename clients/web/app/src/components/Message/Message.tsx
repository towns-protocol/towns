import { format, formatDistance } from 'date-fns'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MessageReactions, RoomIdentifier, ThreadStats } from 'use-zion-client'
import { Reactions } from '@components/Reactions/Reactions'
import { RepliesButton } from '@components/Replies/MessageReplies'
import { Avatar, Box, BoxProps, ButtonText, Paragraph, Stack, Text } from '@ui'
import { useFocused } from 'hooks/useFocused'
import { useHover } from 'hooks/useHover'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { useHandleReaction } from 'hooks/useReactions'
import { AvatarProps } from 'ui/components/Avatar/Avatar'
import { AvatarAtoms } from 'ui/components/Avatar/Avatar.css'
import { CardOpener } from 'ui/components/Overlay/CardOpener'
import { ProfileCard } from '@components/ProfileCard/ProfileCard'
import { MessageContextMenu } from './MessageContextMenu'

type Props = {
    userId?: string | null
    senderId?: string
    avatar?: string
    avatarSize?: AvatarAtoms['size']
    name: string
    displayContext?: 'single' | 'head' | 'tail'
    messageSourceAnnotation?: string
    reactions?: MessageReactions
    replies?: ThreadStats
    canReply?: boolean
    timestamp?: number
    editing?: boolean
    editable?: boolean
    eventId?: string
    highlight?: boolean
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
} & BoxProps

export type MessageProps = Props

export const Message = (props: Props) => {
    const {
        userId,
        senderId,
        eventId,
        avatar,
        avatarSize = 'avatar_md',
        name,
        messageSourceAnnotation,
        channelId,
        spaceId,
        editable: isEditable,
        editing: isEditing,
        highlight: isHighlight,
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

    const { isHover, onMouseEnter } = useHover(ref)
    const { isFocused } = useFocused(ref)

    const isActive = isFocused || isHover

    const date = timestamp
        ? isRelativeDate
            ? `${formatDistance(timestamp, Date.now(), {
                  addSuffix: true,
              })}`
            : format(timestamp, 'h:mm a')
        : undefined

    const backgroundProps = useMessageBackground(isEditing, isActive, isHighlight)

    const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId)
    const onDoubleClick = useCallback(() => {
        if (canReply && eventId) {
            onOpenMessageThread(eventId)
        }
    }, [canReply, onOpenMessageThread, eventId])

    return (
        <Stack
            horizontal
            ref={ref}
            onMouseEnter={onMouseEnter}
            {...boxProps}
            {...backgroundProps}
            tabIndex={0}
            onDoubleClick={canReply ? onDoubleClick : undefined}
        >
            {/* left / avatar gutter */}
            {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
            <Box minWidth="x8">
                {displayContext !== 'tail' ? (
                    senderId ? (
                        <AvatarComponent
                            isActive={isActive}
                            src={avatar}
                            size={avatarSize}
                            insetY="xxs"
                            userId={senderId}
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
                        {/* display name */}
                        {name && (
                            <Text truncate fontSize="md" color="gray1" as="span">
                                {name}&nbsp;
                            </Text>
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
                    <Stack fontSize="md" color="default" gap="md">
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
                {spaceId && channelId && eventId && isActive && !isEditing && (
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
        </Stack>
    )
}

const useMessageBackground = (isEditing?: boolean, isActive?: boolean, isHighlight?: boolean) => {
    const [isHighlightActive, setHighlightActive] = useState(isHighlight)

    const background = isHighlightActive
        ? ('level4' as const)
        : isEditing || isActive
        ? ('level2' as const)
        : undefined

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

    return { onTransitionEnd, style, background }
}

const AvatarComponent = (props: AvatarProps & { userId?: string; isActive: boolean }) => {
    const { userId, isActive, ...avatarProps } = props
    if (isActive && userId) {
        return <ActiveAvatar {...avatarProps} userId={userId} />
    }
    return <Avatar {...avatarProps} />
}

const ActiveAvatar = (props: AvatarProps & { userId: string }) => {
    const { src, size, userId } = props
    return (
        <CardOpener placement="horizontal" render={<ProfileCard userId={userId} />} trigger="click">
            {({ triggerProps }) => <Avatar src={src} size={size} insetY="xxs" {...triggerProps} />}
        </CardOpener>
    )
}
