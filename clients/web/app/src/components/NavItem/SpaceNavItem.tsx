import React from 'react'
import { RoomIdentifier, useSpaceNotificationCounts } from 'use-zion-client'
import { PATHS } from 'routes'
import { Badge, Box, ButtonText, Dot, Icon } from '@ui'
import { IconName } from 'ui/components/Icon'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { SpaceIcon } from '@components/SpaceIcon'
import { useDevice } from 'hooks/useDevice'
import { NavItem } from './_NavItem'

type Props = {
    id: RoomIdentifier
    name: string
    spaceName?: string
    avatar?: string
    badge?: JSX.Element
    icon?: IconName
    forceMatch?: boolean
    highlight?: boolean
    pinned?: boolean
    settings?: boolean
    onSettings?: (id: RoomIdentifier) => void
    exact?: boolean
    isInvite?: boolean
    onClick?: () => void
}

export const SpaceNavItem = (props: Props) => {
    const { id, forceMatch, highlight, avatar, exact, icon, name, pinned, isInvite, onClick } =
        props
    const { isTouch } = useDevice()
    const notificationCounts = useSpaceNotificationCounts(id)
    const mentions = notificationCounts.mentions
    const newMessages = notificationCounts.isUnread
    const sizeContext = useSizeContext()
    // TODO: use tokens
    const isSmall = sizeContext.lessThan(180)

    return (
        <NavItem
            id={id.slug}
            to={isInvite ? `/invites/${id.slug}/` : `/${PATHS.SPACES}/${id.slug}/`}
            exact={exact}
            forceMatch={forceMatch}
            activeBackground={isTouch ? 'level2' : 'level3'}
            highlight={highlight}
            tooltip={isTouch ? undefined : props.name}
            tooltipOptions={{
                placement: 'horizontal',
                immediate: true,
            }}
            onClick={onClick}
        >
            {avatar && (
                <Box position="relative">
                    <SpaceIcon
                        border
                        width="x4"
                        minWidth="x4"
                        aspectRatio="1/1"
                        spaceId={id.networkId}
                        background="level1"
                        rounded="xs"
                        variant="thumbnail100"
                        firstLetterOfSpaceName={name[0]}
                    />
                    {newMessages && <Dot position="bottomRight" />}
                </Box>
            )}

            {icon && <Icon type={icon} color="gray2" background="level2" size="square_lg" />}

            <ButtonText grow truncate color="default">
                {isInvite ? '(Invite) ' + name : name}
            </ButtonText>

            <Box shrink display={isSmall ? 'none' : undefined} color="gray2">
                {pinned && <Icon type="pin" size="square_sm" padding="xs" />}
            </Box>

            <Box shrink display={isSmall ? 'none' : undefined} color="gray2">
                <Badge value={mentions} />
            </Box>
        </NavItem>
    )
}
