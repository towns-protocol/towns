import { format, formatDistance } from 'date-fns'
import React, { useEffect, useRef, useState } from 'react'
import { MessageReactions, RoomIdentifier, ThreadStats } from 'use-zion-client'
import { Reactions } from '@components/Reactions/Reactions'
import { MessageThreadButton } from '@components/Replies/MessageReplies'
import { Avatar, Box, BoxProps, ButtonText, Paragraph, Stack, Text } from '@ui'
import { useHover } from 'hooks/useHover'
import { useHandleReaction } from 'hooks/useReactions'
import { AvatarAtoms } from 'ui/components/Avatar/Avatar.css'
import { MessageContextMenu } from './MessageContextMenu'

type Props = {
    userId?: string | null
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
} & BoxProps

export type MessageProps = Props

export const Message = (props: Props) => {
    const {
        userId,
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

    const date = timestamp
        ? isRelativeDate
            ? `${formatDistance(timestamp, Date.now(), {
                  addSuffix: true,
              })}`
            : format(timestamp, 'h:mm a')
        : undefined

    const backgroundProps = useMessageBackground(isEditing, isHover, isHighlight)

    return (
        <Stack horizontal ref={ref} onMouseEnter={onMouseEnter} {...boxProps} {...backgroundProps}>
            {/* left / avatar gutter */}
            {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
            <Box minWidth="x8">
                {displayContext !== 'tail' ? (
                    <Avatar src={avatar} size={avatarSize} insetY="xxs" />
                ) : (
                    <>
                        {!isRelativeDate && isHover && (
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
                        <Text truncate fontSize="md" color="gray1" as="span">
                            {name}
                        </Text>
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
                            <MessageThreadButton eventId={eventId} threadStats={replies} />
                        </Stack>
                    )}
                </Stack>
                {spaceId && channelId && eventId && isHover && !isEditing && (
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

const useMessageBackground = (isEditing?: boolean, isHover?: boolean, isHighlight?: boolean) => {
    const [isHighlightActive, setHighlightActive] = useState(isHighlight)

    const background = isHighlightActive
        ? ('level4' as const)
        : isEditing || isHover
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
