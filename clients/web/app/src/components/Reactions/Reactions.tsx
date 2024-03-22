import React, { Suspense, useCallback } from 'react'
import { MessageReactions } from 'use-towns-client'
import { TooltipBox as Box } from 'ui/components/Box/TooltipBox'
import { Text } from 'ui/components/Text/Text'
import { EmojiPickerButton } from '@components/EmojiPickerButton'
import { useHandleReaction } from 'hooks/useReactions'
import { Stack } from 'ui/components/Stack/Stack'
import { Pill } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ReactionTootip } from './ReactionTooltip'
import { getNativeEmojiFromName } from './ReactionConstants'

type Props = {
    reactions: MessageReactions
    userId?: string | null
    parentId?: string
    onReaction?: ReturnType<typeof useHandleReaction>
}

export const Reactions = (props: Props) => {
    const { userId, parentId, reactions, onReaction } = props

    const onReactionPicker = useCallback(
        (data: EmojiPickerSelection) => {
            if (onReaction && parentId && data.id) {
                onReaction({
                    type: 'add',
                    parentId,
                    reactionName: data.id,
                })
            }
        },
        [onReaction, parentId],
    )

    const { isTouch } = useDevice()

    return (
        <Stack horizontal flexWrap="wrap" gap={{ default: 'xs', mobile: 'sm' }}>
            <Suspense>
                <ReactionRow
                    userId={userId}
                    parentId={parentId}
                    reactions={reactions}
                    onReaction={onReaction}
                />
            </Suspense>
            <EmojiPickerButton
                pill
                size={isTouch ? 'square_sm' : 'square_xs'}
                onSelectEmoji={onReactionPicker}
            />
        </Stack>
    )
}

const ReactionRow = ({
    reactions,
    userId,
    onReaction,
    parentId,
}: {
    reactions: MessageReactions
    userId?: Props['userId']
    onReaction: Props['onReaction']
    parentId?: Props['parentId']
}) => {
    const onReact = useCallback(
        (reactionName: string, remove: boolean) => {
            if (onReaction && parentId && userId) {
                if (remove) {
                    const eventId = reactions[reactionName]?.[userId]?.eventId
                    if (eventId) {
                        onReaction({
                            type: 'redact',
                            eventId,
                        })
                    }
                } else {
                    onReaction({
                        type: 'add',
                        parentId,
                        reactionName,
                    })
                }
            }
        },
        [onReaction, parentId, reactions, userId],
    )

    const entries = Object.entries<Record<string, { eventId: string }>>(reactions)
    const map = entries.length
        ? entries.map(([reaction, users]) => (
              <Reaction
                  key={reaction}
                  name={reaction}
                  users={users}
                  isOwn={!!(userId && users[userId])}
                  onReact={onReact}
              />
          ))
        : undefined
    return <>{map}</>
}

const Reaction = (props: {
    name: string
    users?: Record<string, { eventId: string }>
    onReact: (reaction: string, remove: boolean) => void
    isOwn?: boolean
}) => {
    const { name, users, onReact, isOwn } = props

    const onClick = useCallback(() => {
        const remove = !!isOwn
        onReact(name, remove)
    }, [isOwn, name, onReact])

    return users && Object.keys(users).length ? (
        <Box horizontal tooltip={<ReactionTootip userIds={users} reaction={name} />}>
            <Pill
                horizontal
                centerContent
                position="relative"
                rounded="lg"
                gap="xs"
                background={isOwn ? 'level3' : undefined}
                border={isOwn ? 'textDefault' : undefined}
                onClick={onClick}
            >
                <Text size="md" fontSize={{ desktop: 'mds', mobile: 'xs' }}>
                    {getNativeEmojiFromName(props.name)}
                </Text>
                <Text fontWeight="medium" size="sm">
                    {Object.keys(users).length}
                </Text>
            </Pill>
        </Box>
    ) : null
}
