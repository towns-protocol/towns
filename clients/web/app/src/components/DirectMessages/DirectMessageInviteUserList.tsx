import { AnimatePresence } from 'framer-motion'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { useMyProfile, useUser, useUserLookupContext, useZionContext } from 'use-zion-client'
import {
    Box,
    Checkbox,
    Divider,
    IconButton,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { usePersistOrder } from 'hooks/usePersistOrder'

export const DirectMessageInviteUserList = (props: {
    onSelectionChange?: (userIds: Set<string>) => void
    hiddenUserIds?: Set<string>
}) => {
    const { onSelectionChange, hiddenUserIds = new Set() } = props
    const [searchTerm, setSearchTerm] = useState('')
    const { users, usersMap } = useUserLookupContext()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())
    const userId = useMyProfile()?.userId

    const toggleMember = useCallback((id: string) => {
        setSelectedUserIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const filteredUserIds = fuzzysort
        .go(searchTerm, users, {
            key: 'displayName',
            all: true,
        })
        .map((r) => r.obj.userId)
        .sort(
            firstBy<string>((id) => (usersMap[id]?.displayName.startsWith(`0x`) ? 1 : -1)).thenBy(
                (id) => usersMap[id]?.displayName,
            ),
        )
        .filter((id) => id !== userId && !hiddenUserIds.has(id))
        .slice(0, 25)

    const recentUsers = usePersistOrder(
        useRecentUsers(userId).filter((id) => !hiddenUserIds.has(id)),
    )

    useEffect(() => {
        onSelectionChange?.(selectedUserIds)
    }, [onSelectionChange, selectedUserIds])

    return (
        <Stack gap grow paddingTop="md">
            <AnimatePresence mode="popLayout">
                {selectedUserIds.size > 0 && (
                    <Stack
                        horizontal
                        scroll
                        paddingX
                        overflowX="scroll"
                        gap="lg"
                        alignItems="center"
                        key="selected-users"
                    >
                        {Array.from(selectedUserIds).map((id) => (
                            <SelectedParticipant key={id} userId={id} onToggle={toggleMember} />
                        ))}
                    </Stack>
                )}
                <MotionStack gap key="searchterm" layout="position">
                    {selectedUserIds.size > 0 && <Divider />}
                    <Box paddingX>
                        <TextField
                            autoFocus
                            background="level2"
                            value={searchTerm}
                            placeholder="Search people"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Box>
                    <Divider />
                </MotionStack>

                <MotionStack gap grow layout="position" position="relative">
                    <Stack scroll scrollbars gap grow absoluteFill insetTop="sm" paddingTop="md">
                        {!searchTerm && recentUsers?.length > 0 && (
                            <Box paddingX>
                                <Paragraph size="sm" color="gray2" fontWeight="medium">
                                    Recent
                                </Paragraph>
                            </Box>
                        )}
                        {(searchTerm ? filteredUserIds : recentUsers).map((id) => (
                            <Participant
                                key={id}
                                userId={id}
                                selected={selectedUserIds.has(id)}
                                onToggle={toggleMember}
                            />
                        ))}
                    </Stack>
                </MotionStack>
            </AnimatePresence>
        </Stack>
    )
}

type ParticipantProps = {
    userId: string
    onToggle: (id: string) => void
}

const Participant = (props: ParticipantProps & { selected: boolean }) => {
    const { userId, onToggle, selected } = props
    const profile = useUser(userId)

    const onClick = useCallback(() => {
        onToggle(userId)
    }, [onToggle, userId])

    return (
        <MotionStack
            horizontal
            gap
            paddingX
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            width="100%"
            alignItems="center"
            layout="position"
            cursor="pointer"
            onClick={onClick}
        >
            <Avatar userId={userId} size="avatar_x4" />
            <Text truncate fontWeight="medium">
                {getPrettyDisplayName(profile).displayName}
            </Text>
            <Box grow />
            <Checkbox name="" checked={selected} onChange={onClick} />
        </MotionStack>
    )
}

const SelectedParticipant = (props: ParticipantProps) => {
    const { userId, onToggle } = props
    const profile = useUser(userId)

    return (
        <MotionStack
            layout
            centerContent
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            gap="sm"
        >
            <Box position="relative">
                <Avatar size="avatar_lg" userId={userId} />
                <IconButton
                    hoverable
                    icon="close"
                    size="square_xxs"
                    position="topRight"
                    rounded="full"
                    background="level4"
                    color="default"
                    border="level3"
                    tooltip="Remove"
                    tooltipOptions={{ placement: 'vertical', immediate: true }}
                    onClick={() => onToggle(userId)}
                />
            </Box>
            <Text truncate fontWeight="medium" fontSize="sm">
                {getPrettyDisplayName(profile).displayName}
            </Text>
        </MotionStack>
    )
}

const useRecentUsers = (userId?: string) => {
    const { dmChannels } = useZionContext()
    return useMemo(() => {
        return dmChannels.reduce((acc, channel) => {
            if (acc.length >= 10) {
                return acc
            }
            channel.userIds.forEach((id) => {
                if (id !== userId && !acc.includes(id)) {
                    acc.push(id)
                }
            })
            return acc
        }, [] as string[])
    }, [dmChannels, userId])
}
