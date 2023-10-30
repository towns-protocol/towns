import { motion } from 'framer-motion'
import React, { forwardRef } from 'react'
import { useInvites, useSpaceContext, useZionContext } from 'use-zion-client'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { RegisterMainShortcuts } from '@components/Shortcuts/RegisterMainShortcuts'
import { SideBar } from '@components/SideBars/_SideBar'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { env } from 'utils'
import { Box, Dot, Icon } from '@ui'
import { NavItem } from '@components/NavItem/_NavItem'

export const MainSideBar = () => {
    const { isTouch } = useDevice()
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()
    const invites = useInvites()
    const { dmUnreadChannelIds } = useZionContext()
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()

    return (
        <SideBar elevateReadability paddingY="sm" height="100%">
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
                    <Icon width="x4" aspectRatio="1/1" size="square_lg" type="dm" />
                    {dmUnreadChannelIds.size > 0 && <Dot position="bottomRight" />}
                </Box>
            </NavItem>

            {spaces.map((s) => (
                <TransitionItem key={s.id.slug}>
                    <SpaceNavItem
                        exact={false}
                        forceMatch={s.id.networkId === spaceId?.networkId}
                        id={s.id}
                        name={s.name}
                        avatar={s.avatarSrc}
                        pinned={false}
                    />
                </TransitionItem>
            ))}
            {(env.DEV || isHolderOfPioneerNft) && (
                <TransitionItem key="new">
                    <ActionNavItem
                        id={`${PATHS.SPACES}/new`}
                        link={`/${PATHS.SPACES}/new`}
                        icon="plus"
                        label="New Town"
                        tooltip="New Town"
                        tooltipOptions={{
                            placement: 'horizontal',
                            immediate: true,
                        }}
                    />
                </TransitionItem>
            )}
            {invites.map((m) => (
                <TransitionItem key={m.id.networkId}>
                    <SpaceNavItem
                        isInvite
                        id={m.id}
                        name={m.name}
                        avatar={m.avatarSrc}
                        pinned={false}
                    />
                </TransitionItem>
            ))}
        </SideBar>
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
