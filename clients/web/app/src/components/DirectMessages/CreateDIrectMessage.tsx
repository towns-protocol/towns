import React, { useCallback, useState } from 'react'
import { useAllKnownUsers, useMyProfile, useUser, useZionClient } from 'use-zion-client'
import fuzzysort from 'fuzzysort'
import { AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Divider,
    IconButton,
    MotionStack,
    Stack,
    Text,
    TextField,
} from '@ui'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

type Props = {
    onDirectMessageCreated: () => void
}

export const CreateDirectMessage = (props: Props) => {
    const [searchTerm, setSearchTerm] = useState('')
    const { onDirectMessageCreated } = props
    const { users } = useAllKnownUsers()
    const { createDMChannel, createGDMChannel } = useZionClient()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())
    const navigate = useNavigate()
    const userId = useMyProfile()?.userId

    const onCreateButtonClicked = useCallback(async () => {
        if (selectedUserIds.size === 1) {
            const first = Array.from(selectedUserIds)[0]
            const streamId = await createDMChannel(first)
            if (streamId) {
                navigate(`/messages/${streamId.slug}`)
                onDirectMessageCreated()
            }
        } else {
            const userIds = Array.from(selectedUserIds)
            const streamId = await createGDMChannel(userIds)
            if (streamId) {
                navigate(`/messages/${streamId.slug}`)
                onDirectMessageCreated()
            }
        }
    }, [selectedUserIds, createDMChannel, createGDMChannel, navigate, onDirectMessageCreated])

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
            key: 'name',
            all: true,
        })
        .map((r) => r.obj.userId)
        .filter((id) => id !== userId)
        .slice(0, 10)

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
                        {filteredUserIds.map((id) => (
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
            <Box
                paddingX
                paddingBottom="md"
                position="absolute"
                bottom="none"
                left="none"
                right="none"
            >
                <Button
                    disabled={selectedUserIds.size === 0}
                    tone="cta1"
                    onClick={onCreateButtonClicked}
                >
                    {selectedUserIds.size > 1 ? 'Create Group DM' : 'Create DM'}
                </Button>
            </Box>
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
            onClick={onClick}
        >
            <Avatar userId={userId} size="avatar_x4" />
            <Text truncate fontWeight="medium">
                {getPrettyDisplayName(profile).name}
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
                {getPrettyDisplayName(profile).name}
            </Text>
        </MotionStack>
    )
}
