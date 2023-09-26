import React from 'react'
import { useNameSequence } from 'hooks/useNameSequence'
import { Box } from 'ui/components/Box/Box'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Text } from 'ui/components/Text/Text'
import { Tooltip } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
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
        <Tooltip background="level2" rounded="sm">
            <Box width="200" gap="sm">
                <Box centerContent>
                    <Box
                        border
                        padding
                        centerContent
                        maxWidth="100"
                        rounded="sm"
                        background={{
                            lightMode: 'level3',
                            darkMode: 'inverted',
                        }}
                        aspectRatio="1/1"
                    >
                        <Text size="h2">{getNativeEmojiFromName(reaction)}</Text>
                    </Box>
                </Box>

                <Paragraph size="sm" textAlign="center" color="default">
                    {names}{' '}
                    <span style={{ whiteSpace: 'nowrap' }} className={atoms({ color: 'gray2' })}>
                        reacted with :{reaction}:
                    </span>
                </Paragraph>
            </Box>
        </Tooltip>
    )
}
