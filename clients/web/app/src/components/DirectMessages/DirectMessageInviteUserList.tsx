import { AnimatePresence } from 'framer-motion'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { useMyUserId, useUser, useUserLookupContext, useZionContext } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { FadeInBox } from '@components/Transitions'
import {
    Box,
    Checkbox,
    Divider,
    Icon,
    IconButton,
    MotionStack,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { useDevice } from 'hooks/useDevice'
import { usePersistOrder } from 'hooks/usePersistOrder'
import { useGetUserBio } from 'hooks/useUserBio'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

export const DirectMessageInviteUserList = (props: {
    onSelectionChange?: (userIds: Set<string>) => void
    hiddenUserIds?: Set<string>
    isMultiSelect?: boolean
    onToggleMultiSelect?: () => void
    children?: React.ReactNode
}) => {
    const { onSelectionChange, hiddenUserIds = new Set(), isMultiSelect = false } = props
    const [searchTerm, setSearchTerm] = useState('')
    const { users, usersMap } = useUserLookupContext()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())
    const userId = useMyUserId()
    const { isTouch } = useDevice()

    const toggleMember = useCallback(
        (id: string) => {
            if (!isMultiSelect && selectedUserIds.size >= 1) {
                return
            }
            setSelectedUserIds((prev) => {
                const next = new Set(prev)
                if (next.has(id)) {
                    next.delete(id)
                } else {
                    next.add(id)
                }
                return next
            })
        },
        [isMultiSelect, selectedUserIds.size],
    )

    const filteredUserIds = fuzzysort
        .go(searchTerm, users, {
            keys: ['displayName', 'username'],
            all: true,
        })
        .map((r) => r.obj.userId)
        .sort(
            firstBy<string>((id) => (usersMap[id]?.displayName.startsWith(`0x`) ? 1 : -1)).thenBy(
                (id) => usersMap[id]?.displayName,
            ),
        )
        .filter((id) => (!isMultiSelect || id !== userId) && !hiddenUserIds.has(id))
        .slice(0, 25)

    const recentUsers = usePersistOrder(
        useRecentUsers(userId).filter((id) => !hiddenUserIds.has(id)),
    )

    const allUsers = usePersistOrder(
        users
            .map((u) => u.userId)
            .filter((id) => !hiddenUserIds.has(id) && !recentUsers.includes(id)),
    )

    useEffect(() => {
        onSelectionChange?.(selectedUserIds)
        setSearchTerm('')
    }, [onSelectionChange, selectedUserIds])

    const onToggleGroupDM = useCallback(() => {
        if (props.onToggleMultiSelect) {
            setSelectedUserIds(new Set())
            if (!filteredUserIds.length) {
                setSearchTerm('')
            }
            props.onToggleMultiSelect()
        }
    }, [filteredUserIds.length, props])

    const [isSettled, setIsSettled] = useState(!isTouch)

    useEffect(() => {
        if (isTouch) {
            const timeout = setTimeout(() => {
                setIsSettled(true)
            }, 1000)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [isTouch])

    const layout = isSettled ? 'position' : undefined

    return (
        <MotionStack grow>
            <AnimatePresence mode="popLayout">
                {isMultiSelect && selectedUserIds.size > 0 && (
                    <FadeInBox
                        horizontal
                        scroll
                        paddingX
                        gap
                        paddingTop="md"
                        overflowX="scroll"
                        alignItems="center"
                        key="selected-users"
                    >
                        {Array.from(selectedUserIds).map((id) => (
                            <SelectedParticipant key={id} userId={id} onToggle={toggleMember} />
                        ))}
                    </FadeInBox>
                )}
                <MotionStack grow layout={layout}>
                    <Stack gap paddingY key="search">
                        {isMultiSelect && selectedUserIds.size > 0 && <Divider />}
                        <Box paddingX horizontal>
                            <TextField
                                autoFocus={isSettled}
                                background="level2"
                                value={searchTerm}
                                placeholder="Search people"
                                after={
                                    searchTerm && (
                                        <Icon type="close" onClick={() => setSearchTerm('')} />
                                    )
                                }
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </Box>
                    </Stack>
                    <Stack
                        grow
                        scroll
                        scrollbars
                        paddingBottom="md"
                        key="selector"
                        flexBasis="300"
                        gap="xxs"
                    >
                        {!isMultiSelect && (
                            <>
                                <ListItem selected={false} onClick={onToggleGroupDM}>
                                    <IconButton
                                        background="level2"
                                        size="square_md"
                                        icon="people"
                                        color="default"
                                        rounded="full"
                                        padding="sm"
                                    />

                                    <Paragraph whiteSpace="nowrap">Create new group</Paragraph>
                                </ListItem>

                                {!searchTerm && (
                                    <>
                                        <Divider />
                                        <Box padding color="gray2">
                                            <Paragraph>Suggested</Paragraph>
                                        </Box>
                                    </>
                                )}
                            </>
                        )}

                        {(searchTerm
                            ? recentUsers.filter((u) => filteredUserIds.includes(u))
                            : recentUsers
                        ).map((id) => (
                            <Participant
                                key={id}
                                userId={id}
                                selected={selectedUserIds.has(id)}
                                isCheckbox={isMultiSelect}
                                layout={layout}
                                onToggle={toggleMember}
                            />
                        ))}
                        {/* {!searchTerm && <Divider space="md" label="Everyone" />} */}
                        {!searchTerm && (
                            <Box padding color="gray2">
                                <Paragraph>Everyone</Paragraph>
                            </Box>
                        )}
                        {(searchTerm
                            ? allUsers.filter((u) => filteredUserIds.includes(u))
                            : allUsers
                        ).map((id) => (
                            <Participant
                                key={id}
                                userId={id}
                                selected={selectedUserIds.has(id)}
                                isCheckbox={isMultiSelect}
                                layout={layout}
                                onToggle={toggleMember}
                            />
                        ))}
                    </Stack>
                    {props.children}
                </MotionStack>
            </AnimatePresence>
        </MotionStack>
    )
}

type ParticipantProps = {
    userId: string
    onToggle: (id: string) => void
}

const Participant = (
    props: ParticipantProps & {
        selected: boolean
        isCheckbox: boolean
        layout: 'position' | undefined
    },
) => {
    const { userId, onToggle, selected, isCheckbox } = props
    const profile = useUser(userId)

    const { data: userBio } = useGetUserBio(userId)

    const onClick = useCallback(() => {
        onToggle(userId)
    }, [onToggle, userId])

    return (
        <ListItem selected={selected} onClick={onClick}>
            <Avatar userId={userId} size="avatar_x4" />
            <Box gap="sm" overflow="hidden" paddingY="xs">
                <Paragraph truncate color="default">
                    {getPrettyDisplayName(profile)}
                </Paragraph>
                {userBio && (
                    <Paragraph truncate color="gray2" size="sm">
                        {userBio}
                    </Paragraph>
                )}
            </Box>
            <Box grow shrink={false} alignItems="end">
                {isCheckbox && <Checkbox name="" checked={selected} onChange={onClick} />}
            </Box>
        </ListItem>
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
                <Avatar size="avatar_md" userId={userId} />
                <Box position="topRight" insetX="xxs">
                    <IconButton
                        hoverable
                        icon="close"
                        size="square_xxs"
                        rounded="full"
                        background="level4"
                        color="default"
                        border="level3"
                        tooltip="Remove"
                        tooltipOptions={{ placement: 'vertical', immediate: true }}
                        onClick={() => onToggle(userId)}
                    />
                </Box>
            </Box>
            <Box maxWidth="x8" height="x2" overflow="hidden" justifyContent="center">
                <Text truncate fontWeight="medium" fontSize="xs">
                    {getPrettyDisplayName(profile)}
                </Text>
            </Box>
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

const ListItem = (props: { onClick: () => void; selected: boolean; children: React.ReactNode }) => (
    <Box horizontal width="100%" paddingX="sm" onClick={props.onClick}>
        <Box
            hoverable
            horizontal
            gap
            width="100%"
            cursor="pointer"
            background={props.selected ? 'level2' : 'level1'}
            alignItems="center"
            padding="sm"
            borderRadius="sm"
        >
            {props.children}
        </Box>
    </Box>
)
