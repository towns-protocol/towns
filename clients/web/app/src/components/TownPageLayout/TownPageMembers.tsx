import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { FadeInBox } from '@components/Transitions'
import { Box, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { AvatarWithoutDot } from '@components/Avatar/Avatar'
import { useFetchUnauthenticatedActivity } from './useFetchUnauthenticatedActivity'

export const TownPageMembers = (props: { townId: string }) => {
    const { townId } = props
    const { members: _members } = useFetchUnauthenticatedActivity(townId)
    const members = _members?.[townId]
    const { isTouch } = useDevice()
    const maxMembers = isTouch ? 7 : 10

    return (
        <AnimatePresence>
            <Stack gap="x4">
                {!!members && members.length > 0 && (
                    <FadeInBox
                        horizontal
                        gap="md"
                        maxWidth={{ mobile: '100%', default: '600' }}
                        key="members"
                    >
                        <Stack gap="md">
                            <Text strong size="md" data-testid="town-preview-members-count">
                                {members.length} {members.length === 1 ? 'Member' : 'Members'}
                            </Text>
                            <Stack
                                horizontal
                                gap="sm"
                                data-testid="town-preview-members-avatars-container"
                            >
                                {members.slice(0, maxMembers).map((m) => (
                                    <AvatarWithoutDot key={m} userId={m} size="avatar_x4" />
                                ))}
                                {members.length > maxMembers && (
                                    <Box
                                        centerContent
                                        width="x4"
                                        height="x4"
                                        background="hover"
                                        rounded="full"
                                    >
                                        <Text strong size="xs" color="default">
                                            +{members.length - maxMembers}
                                        </Text>
                                    </Box>
                                )}
                            </Stack>
                        </Stack>
                    </FadeInBox>
                )}
            </Stack>
        </AnimatePresence>
    )
}
