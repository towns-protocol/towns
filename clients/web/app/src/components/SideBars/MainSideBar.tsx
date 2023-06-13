import React from 'react'
import { useInvites, useSpaceContext, useZionContext } from 'use-zion-client'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SideBar } from '@components/SideBars/_SideBar'
import { Stack } from '@ui'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { PATHS } from 'routes'
import { env } from 'utils'
import { DMSNavItem } from '@components/NavItem/DMSNavItem'

type Props = {
    expanded: boolean
    onExpandClick: () => void
}

export const MainSideBar = (props: Props) => {
    const { expanded: isExpanded } = props
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()
    const invites = useInvites()
    const { data: isHolderOfPioneerNft } = useIsHolderOfPioneerNFT()

    return (
        <SideBar elevateReadability paddingY="sm">
            <Stack grow>
                <ProfileCardButton expanded={isExpanded} />
                <DMSNavItem />
                {spaces.map((s) => (
                    <SpaceNavItem
                        key={s.id.slug}
                        exact={false}
                        forceMatch={s.id.networkId === spaceId?.networkId}
                        id={s.id}
                        name={s.name}
                        avatar={s.avatarSrc}
                        pinned={false}
                    />
                ))}
                {(env.IS_DEV || isHolderOfPioneerNft) && (
                    <ActionNavItem
                        id={`${PATHS.SPACES}/new`}
                        link={`/${PATHS.SPACES}/new`}
                        icon="plus"
                        label="New Town"
                    />
                )}
                {invites.map((m, index) => (
                    <SpaceNavItem
                        isInvite
                        key={m.id.slug}
                        id={m.id}
                        name={m.name}
                        avatar={m.avatarSrc}
                        pinned={false}
                    />
                ))}
            </Stack>
        </SideBar>
    )
}
