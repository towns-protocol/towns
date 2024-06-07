import { AnimatePresence } from 'framer-motion'
import fuzzysort from 'fuzzysort'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { firstBy } from 'thenby'
import { LookupUser, useMyUserId, useUser, useUserLookupStore } from 'use-towns-client'
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
import { useRecentUsers } from '../../hooks/useRecentUsers'

/**
 * InviteUserList was first create to select users to participate in a channel
 * and was later repurposed to select users to invite to a direct message.
 * Jan 2024 - This component is now only used to select users to a channel and
 * may have traces of the direct message use case.
 */

export const InviteUserList = (props: {
    onSelectionChange?: (userIds: Set<string>) => void
    hiddenUserIds?: Set<string>
    isMultiSelect?: boolean
    onToggleMultiSelect?: () => void
    children?: React.ReactNode
}) => {
    const { onSelectionChange, hiddenUserIds = new Set(), isMultiSelect = false } = props
    const [searchTerm, setSearchTerm] = useState('')
    const { allUsers } = useUserLookupStore()
    const usersList = useMemo(() => Object.values(allUsers).flatMap((m) => m), [allUsers])
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

    const filteredUserIds = useMemo(() => {
        return fuzzysort
            .go(searchTerm, usersList, {
                keys: ['displayName', 'username'],
                all: true,
            })
            .map((result) => result.obj) // Assuming `result.obj` contains the user object
            .sort(
                firstBy<LookupUser>((user) =>
                    user?.displayName?.startsWith('0x') ? 1 : -1,
                ).thenBy((user) => user?.displayName),
            )
            .filter(
                (user) =>
                    (!isMultiSelect || user.userId !== userId) && !hiddenUserIds.has(user.userId),
            )
            .slice(0, 25)
    }, [hiddenUserIds, isMultiSelect, searchTerm, userId, usersList])

    const recentUsers = usePersistOrder(
        useRecentUsers(userId).filter((id) => !hiddenUserIds.has(id)),
    )

    useEffect(() => {
        onSelectionChange?.(selectedUserIds)
        setSearchTerm('')
    }, [onSelectionChange, selectedUserIds])

    const onToggleMultiSelect = useCallback(() => {
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

    const [activeIndex, setActiveIndex] = useState(1)

    useEffect(() => {
        if (isMultiSelect) {
            setActiveIndex(0)
        }
    }, [isMultiSelect])

    const listRef = React.useRef<HTMLDivElement>(null)

    const priorityList = searchTerm
        ? recentUsers.filter((u) => filteredUserIds.includes(u))
        : recentUsers

    const buttonListLength = isMultiSelect ? 0 : 1
    const priorityListLength = priorityList.length + buttonListLength
    const totalListLength = priorityList.length + usersList.length + buttonListLength

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex((a) => Math.min(totalListLength - 1, a + 1))
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex((a) => Math.max(0, a - 1))
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                const el = listRef.current?.querySelector(`#search-item-${activeIndex}`)
                const link = (el?.querySelector('a') ?? el) as HTMLElement
                if ('click' in link) {
                    link.click()
                }
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [activeIndex, usersList.length, props, priorityList.length, totalListLength])

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
                        ref={listRef}
                    >
                        {!isMultiSelect && (
                            <ListItem
                                selected={false}
                                id={`search-item-${0}`}
                                isHighlighted={activeIndex === 0}
                                onClick={onToggleMultiSelect}
                            >
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
                        )}

                        {!searchTerm && (
                            <>
                                <Divider space="md" />
                                <Box padding color="gray2">
                                    <Paragraph>Suggested</Paragraph>
                                </Box>
                            </>
                        )}

                        {priorityList.map((id, index) => (
                            <Participant
                                id={`search-item-${index + buttonListLength}`}
                                key={id}
                                userId={id}
                                selected={selectedUserIds.has(id)}
                                isHighlighted={index + buttonListLength === activeIndex}
                                isCheckbox={isMultiSelect}
                                layout={layout}
                                onToggle={toggleMember}
                            />
                        ))}
                        {!searchTerm && (
                            <Box padding color="gray2">
                                <Paragraph>Everyone</Paragraph>
                            </Box>
                        )}
                        {(searchTerm
                            ? usersList.filter((u) => filteredUserIds.includes(u))
                            : usersList
                        ).map((id, index) => (
                            <Participant
                                key={id}
                                id={`search-item-${priorityListLength + index}`}
                                isHighlighted={priorityListLength + index === activeIndex}
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
        id?: string
        selected: boolean
        isCheckbox: boolean
        layout: 'position' | undefined
        isHighlighted?: boolean
    },
) => {
    const { userId, onToggle, selected, isCheckbox, isHighlighted } = props
    const profile = useUser(userId)

    const { data: userBio } = useGetUserBio(userId)

    const onClick = useCallback(() => {
        onToggle(userId)
    }, [onToggle, userId])

    return (
        <ListItem selected={selected} id={props.id} isHighlighted={isHighlighted} onClick={onClick}>
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

const ListItem = (props: {
    onClick: () => void
    selected: boolean
    children: React.ReactNode
    isHighlighted?: boolean
    id?: string
}) => (
    <Box horizontal width="100%" paddingX="sm" id={props.id} onClick={props.onClick}>
        <Box
            hoverable
            horizontal
            gap
            elevate={props.isHighlighted}
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
