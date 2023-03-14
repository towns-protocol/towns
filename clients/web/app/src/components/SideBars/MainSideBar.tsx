import React from 'react'
import { useInvites, useSpaceContext, useZionContext } from 'use-zion-client'
import { PATHS } from 'routes'
import { ActionNavItem } from '@components/NavItem/ActionNavItem'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { ProfileCardButton } from '@components/ProfileCardButton/ProfileCardButton'
import { SideBar } from '@components/SideBars/_SideBar'
import { IconButton, Stack } from '@ui'
import { useIsHolderOfPioneerNFT } from 'api/lib/isHolderOfToken'
import { env } from 'utils'

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
        <SideBar paddingY="sm">
            <Stack grow>
                <ProfileCardButton expanded={isExpanded} />
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
                        label="New Space"
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
            <Stack
                padding
                gap
                key="profile_container"
                justifyContent="spaceBetween"
                alignItems="start"
                horizontal={isExpanded}
            >
                <IconButton
                    centerContent
                    opaque
                    icon={isExpanded ? 'sidebaropen' : 'sidebarclose'}
                    size="square_md"
                    onClick={props.onExpandClick}
                />
            </Stack>
        </SideBar>
    )
}
