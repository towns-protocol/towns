import { motion } from 'framer-motion'
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import {
    SpaceItem,
    useInvites,
    useMyUserId,
    useSpaceContext,
    useTownsContext,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { firstBy } from 'thenby'
import { isEqual } from 'lodash'
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

            <SpaceList spaces={spaces} spaceId={spaceId} />

            {invites.map((m) => (
                <TransitionItem key={m.id}>
                    <SpaceNavItem
                        isInvite
                        id={m.id}
                        pinned={false}
                        spaceName={spaces.find((sp) => sp.id === spaceId)?.name || ''}
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

    const [setFavoritedSpaces, favoritedSpaces] = useUserStore((s) => [
        s.setFavoriteSpaces,
        (userId && s.users[userId]?.favoriteSpaces) || [],
    ])

    const spaceIdsRef = useRef<string[]>([])
    const spaceIds = useMemo(() => {
        const ids = spaces.map((s) => s.id)
        spaceIdsRef.current = ids
        return isEqual(ids, spaceIdsRef.current) ? spaceIdsRef.current : ids
    }, [spaces])
    const orderedSpaces = useOrderedSpaces({ spaceIds, favoritedSpaces })

    const navigate = useNavigate()

    const onSelectItem = useCallback(
        (id: string) => {
            navigate(`/${PATHS.SPACES}/${id}/`)
            props.onSelectSpace?.(id)
        },
        [navigate, props],
    )

    useEffect(() => {
        if (userId) {
            setFavoritedSpaces(userId, favoritedSpaces)
        }
    }, [favoritedSpaces, setFavoritedSpaces, userId])

    return orderedSpaces.map((s) => (
        <TransitionItem key={s}>
            <SpaceNavItem
                exact={false}
                forceMatch={s === spaceId}
                id={s}
                spaceName={spaces.find((sp) => sp.id === s)?.name || ''}
                pinned={false}
                onClick={() => {
                    onSelectItem(s)
                }}
            />
        </TransitionItem>
    ))
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

const useOrderedSpaces = ({
    spaceIds,
    favoritedSpaces,
}: {
    spaceIds: string[]
    favoritedSpaces: string[]
}) => {
    const { spaceUnreads } = useTownsContext()

    const prevOrderedSpaces = useRef<string[]>([])

    const orderedSpaces = useMemo(
        () =>
            [...spaceIds].sort(
                firstBy((s: string) => {
                    const index = favoritedSpaces.indexOf(s)
                    return index === -1 ? Number.MAX_SAFE_INTEGER : index
                }, 1)
                    .thenBy((s: string) => spaceUnreads[s], -1)
                    .thenBy((s: string) => prevOrderedSpaces.current.indexOf(s)),
            ),
        [favoritedSpaces, spaceUnreads, spaceIds],
    )

    prevOrderedSpaces.current = orderedSpaces
    return orderedSpaces
}
