import { motion } from 'framer-motion'
import React, { forwardRef } from 'react'
import { useInvites, useSpaceContext, useTownsContext } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { RegisterMainShortcuts } from '@components/Shortcuts/RegisterMainShortcuts'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { Box, Card, Dot, Icon } from '@ui'
import { NavItem } from '@components/NavItem/_NavItem'
import { useAnalytics } from 'hooks/useAnalytics'

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

            {spaces.map((s) => (
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
            ))}
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
