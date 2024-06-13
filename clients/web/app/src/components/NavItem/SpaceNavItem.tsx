import React from 'react'
import { useSpaceNotificationCounts } from 'use-towns-client'
import { SpaceIcon } from '@components/SpaceIcon'
import { Badge, Box, ButtonText, Dot, Icon } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useShowHasUnreadBadgeForSpaceId } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { IconName } from 'ui/components/Icon'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    name: string
    spaceName?: string
    avatar?: string
    badge?: JSX.Element
    icon?: IconName
    forceMatch?: boolean
    highlight?: boolean
    pinned?: boolean
    settings?: boolean
    onSettings?: (id: string) => void
    exact?: boolean
    isInvite?: boolean
    isDragging?: boolean
    onClick?: () => void
}

export const SpaceNavItem = (props: Props) => {
    const { id, forceMatch, highlight, exact, icon, name, pinned, isInvite } = props
    const { isTouch } = useDevice()
    const notificationCounts = useSpaceNotificationCounts(id)
    const mentions = notificationCounts.mentions
    const newMessages = useShowHasUnreadBadgeForSpaceId(id)
    const sizeContext = useSizeContext()
    // TODO: use tokens
    const isSmall = sizeContext.lessThan(180)

    return (
        <NavItem
            id={id}
            exact={exact}
            forceMatch={forceMatch}
            activeBackground={isTouch ? 'level2' : 'level3'}
            highlight={highlight}
            cursor="pointer"
            style={{ touchAction: 'none' }}
            tooltip={isTouch ? undefined : props.name}
            tooltipOptions={{
                placement: 'horizontal',
                immediate: true,
                disabled: isTouch || props.isDragging,
            }}
        >
            <Box position="relative">
                <SpaceIcon
                    border
                    fadeIn
                    width="x4"
                    minWidth="x4"
                    aspectRatio="1/1"
                    spaceId={id}
                    background="level1"
                    rounded="xs"
                    variant="thumbnail100"
                    firstLetterOfSpaceName={name[0]}
                />
                {newMessages && (
                    <Dot position="topRight" style={{ transform: `translate(25%,-25%)` }} />
                )}
            </Box>

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
