import React from 'react'
import { useNameSequence } from 'hooks/useNameSequence'
import { Box } from 'ui/components/Box/Box'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Text } from 'ui/components/Text/Text'
import { Tooltip } from '@ui'
import { getNativeEmojiFromName } from './ReactionConstants'

export const ReactionTootip = ({
    userIds: users,
    reaction,
}: {
    userIds: Record<string, { eventId: string }>
    reaction: string
}) => {
    const names = useNameSequence(users)

    return (
        <Tooltip background="level2" rounded="sm" gap="sm" maxWidth="200">
            <Box
                border
                padding
                centerContent
                rounded="sm"
                background={{
                    lightMode: 'level3',
                    darkMode: 'inverted',
                }}
                aspectRatio="1/1"
            >
                <Text size="h2">{getNativeEmojiFromName(reaction)}</Text>
            </Box>

            <Paragraph size="sm" textAlign="center" color="default">
                {names}
                <Text as="span" size="sm" textAlign="center" color="gray2">
                    reacted with :{reaction}:
                </Text>
            </Paragraph>
        </Tooltip>
    )
}
