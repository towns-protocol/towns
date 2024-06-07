import { Reorder, motion } from 'framer-motion'
import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
    SpaceItem,
    useInvites,
    useMyUserId,
    useSpaceContext,
    useTownsContext,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { RegisterMainShortcuts } from '@components/Shortcuts/RegisterMainShortcuts'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { Box, Card, Dot, Icon } from '@ui'
import { NavItem } from '@components/NavItem/_NavItem'
import { useAnalytics } from 'hooks/useAnalytics'
import { useUserStore } from 'store/userSettingsStore'

export const MainSideBar = () => {
    const { isTouch } = useDevice()
    const { spaces } = useTownsContext()
    const { spaceId } = useSpaceContext()
    const invites = useInvites()
    const { dmUnreadChannelIds } = useTownsContext()
    const { analytics } = useAnalytics()

    const onShowCreateSpace = useEvent(() => {
        analytics?.track('clicked new town', {}, () => {
            console.log('[analytics] clicked new town')
        })
    })

    return (
        <Card scroll absoluteFill width="x8">
            {!isTouch && <RegisterMainShortcuts />}
            <NavItem
                centerContent
                to={`/${PATHS.MESSAGES}`}
                label="Direct Messages"
                tooltip="Direct Messages"
                tooltipOptions={{
                    placement: 'horizontal',
                    immediate: true,
                }}
            >
                <Box position="relative">
                    <Icon
                        width="x4"
                        aspectRatio="1/1"
                        size="square_lg"
                        type="dm"
                        background="level2"
                    />
                    {dmUnreadChannelIds.size > 0 && <Dot position="topRight" />}
                </Box>
            </NavItem>
            <SpaceList spaces={spaces} spaceId={spaceId} />
            <TransitionItem key="new">
                <ActionNavItem
                    id={`${PATHS.SPACES}/new`}
                    link={`/${PATHS.SPACES}/new`}
                    icon="plus"
                    tooltip="New Town"
                    tooltipOptions={{
                        placement: 'horizontal',
                        immediate: true,
                    }}
                    onClick={onShowCreateSpace}
                />
            </TransitionItem>
            {invites.map((m) => (
                <TransitionItem key={m.id}>
                    <SpaceNavItem
                        isInvite
                        id={m.id}
                        name={m.name}
                        avatar={m.avatarSrc}
                        pinned={false}
                    />
                </TransitionItem>
            ))}
        </Card>
    )
}

export const SpaceList = (props: {
    spaces: SpaceItem[]
    spaceId?: string
    onSelectSpace?: (spaceId: string) => void
}) => {
    const { spaces, spaceId } = props
    const userId = useMyUserId()

    const [setPersistedOrderedSpaces, persistedOrderedSpaces] = useUserStore((s) => [
        s.setOrderedSpaces,
        (userId && s.users[userId]?.orderedSpaces) || [],
    ])

    const [isDragging, setIsDragging] = useState(false)
    const navigate = useNavigate()
    const onSelectItem = useCallback(
        (id: string) => {
            if (!isDragging) {
                navigate(`/${PATHS.SPACES}/${id}/`)
                props.onSelectSpace?.(id)
            }
        },
        [isDragging, navigate, props],
    )

    const [orderedSpaces, onReorder] = useState(() =>
        persistedOrderedSpaces?.length ? persistedOrderedSpaces : spaces.map((s) => s.id),
    )

    useEffect(() => {
        if (userId) {
            setPersistedOrderedSpaces(userId, orderedSpaces)
        }
    }, [orderedSpaces, setPersistedOrderedSpaces, userId])

    const handleDragStart = () => {
        setIsDragging(true)
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    return (
        <Reorder.Group axis="y" values={orderedSpaces} onReorder={onReorder}>
            {spaces
                .slice()
                .sort((a, b) =>
                    Math.sign(orderedSpaces.indexOf(a.id) - orderedSpaces.indexOf(b.id)),
                )
                .map((s) => (
                    <Reorder.Item
                        key={s.id}
                        value={s.id}
                        onClick={() => onSelectItem(s.id)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <TransitionItem key={s.id}>
                            <SpaceNavItem
                                exact={false}
                                forceMatch={s.id === spaceId}
                                id={s.id}
                                name={s.name}
                                avatar={s.avatarSrc}
                                pinned={false}
                            />
                        </TransitionItem>
                    </Reorder.Item>
                ))}
        </Reorder.Group>
    )
}

const TransitionItem = forwardRef<HTMLDivElement, { children: React.ReactNode }>((props, ref) => (
    <motion.div
        layout="position"
        ref={ref}
        transition={{
            restDelta: 0.01,
            type: 'spring',
            stiffness: 500,
            damping: 40,
            opacity: {
                duration: 0.4,
                delay: 0.1,
            },
            layout: {
                type: 'spring',
                stiffness: 500,
                damping: 50,
            },
        }}
        initial="hide"
        animate="show"
        variants={{
            hide: { opacity: 0 },
            show: { opacity: 1 },
        }}
    >
        {props.children}
    </motion.div>
))
