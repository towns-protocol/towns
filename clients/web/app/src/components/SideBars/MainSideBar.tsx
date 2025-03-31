import { motion } from 'framer-motion'
import React, { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react'
import { SpaceItem, useMyUserId, useSpaceContext, useTownsContext } from 'use-towns-client'
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
import { Analytics } from 'hooks/useAnalytics'
import { useUserStore } from 'store/userSettingsStore'
import { addressFromSpaceId } from 'ui/utils/utils'
import { isTownBanned } from 'utils'

export const MainSideBar = () => {
    const { isTouch } = useDevice()
    const { spaces } = useTownsContext()
    const { spaceId } = useSpaceContext()
    const { dmUnreadChannelIds } = useTownsContext()

    // Filter out banned towns from spaces list
    const filteredSpaces = useMemo(() => {
        return spaces.filter((space) => {
            const address = addressFromSpaceId(space.id)
            return address ? !isTownBanned(address) : true
        })
    }, [spaces])

    const onShowCreateSpace = useEvent(() => {
        Analytics.getInstance().track('clicked new town', {}, () => {
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
                data-testid="direct-messages"
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
            <TransitionItem key="explore">
                <ActionNavItem
                    id={`${PATHS.EXPLORE}`}
                    link={`/${PATHS.EXPLORE}`}
                    icon="explore"
                    tooltip="Explore"
                    tooltipOptions={{
                        placement: 'horizontal',
                        immediate: true,
                    }}
                    data-testid="explore"
                />
            </TransitionItem>
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
                    data-testid="add-new-town"
                    onClick={onShowCreateSpace}
                />
            </TransitionItem>

            <SpaceList spaces={filteredSpaces} spaceId={spaceId} />
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
        (spaceId: string) => {
            navigate(`/${PATHS.SPACES}/${addressFromSpaceId(spaceId)}/`)
            props.onSelectSpace?.(spaceId)
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
