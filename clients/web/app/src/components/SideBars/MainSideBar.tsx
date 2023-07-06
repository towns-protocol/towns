import { motion } from 'framer-motion'
import React, { forwardRef } from 'react'
import { useInvites, useSpaceContext, useZionContext } from 'use-zion-client'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { DMSNavItem } from '@components/NavItem/DMSNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SideBar } from '@components/SideBars/_SideBar'
import { Box } from '@ui'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { PATHS } from 'routes'
import { env } from 'utils'

export const MainSideBar = () => {
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()
    const invites = useInvites()
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()

    return (
        <SideBar elevateReadability paddingY="sm" height="100%">
            <TransitionItem key="profile">
                <ProfileCardButton />
            </TransitionItem>
            <Box borderBottom="faint" height="1" />
            <TransitionItem key="dms">
                <DMSNavItem />
            </TransitionItem>
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
            {(env.IS_DEV || isHolderOfPioneerNft) && (
                <TransitionItem key="new">
                    <ActionNavItem
                        id={`${PATHS.SPACES}/new`}
                        link={`/${PATHS.SPACES}/new`}
                        icon="plus"
                        label="New Town"
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
