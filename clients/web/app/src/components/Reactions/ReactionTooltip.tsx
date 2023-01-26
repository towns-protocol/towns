import { motion } from 'framer-motion'
import React from 'react'
import { Box, Paragraph, Text } from '@ui'
import { useNameSequence } from 'hooks/useNameSequence'
import { getNativeEmojiFromName } from './Reactions'

export const ReactionTootip = ({
    userIds: users,
    reaction,
}: {
    userIds: Record<string, { eventId: string }>
    reaction: string
}) => {
    const names = useNameSequence(users)

    return (
        <MotionBox
            centerContent
            border
            padding="sm"
            background="level2"
            rounded="sm"
            gap="sm"
            maxWidth="200"
            boxShadow="avatar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.1 }}
        >
            <Box border padding centerContent rounded="sm" background="inverted" aspectRatio="1/1">
                <Text size="h2">{getNativeEmojiFromName(reaction)}</Text>
            </Box>

            <Paragraph size="sm" textAlign="center" color="default">
                {names}
                <Text as="span" size="sm" textAlign="center" color="gray2">
                    reacted with :{reaction}:
                </Text>
            </Paragraph>
        </MotionBox>
    )
}

const MotionBox = motion(Box)
