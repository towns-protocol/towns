import React, { useCallback } from 'react'
import { RoomIdentifier, useSpaceNotificationCounts } from 'use-zion-client'
import { PATHS } from 'routes'
import { SpaceSettingsCard } from '@components/Cards/SpaceSettingsCard'
import { SpaceNavTooltip } from '@components/Tooltips/SpaceNavTooltip'
import { Badge, Box, ButtonText, Dot, Icon, TooltipRenderer } from '@ui'
import { IconName } from 'ui/components/Icon'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { SpaceIcon } from '@components/SpaceIcon'
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
}

export const SpaceNavItem = (props: Props) => {
    const {
        id,
        forceMatch,
        highlight,
        avatar,
        exact,
        icon,
        name,
        pinned,
        settings,
        onSettings,
        isInvite,
    } = props

    const notificationCounts = useSpaceNotificationCounts(id)
    const mentions = notificationCounts.mentions
    const newMessages = notificationCounts.isUnread
    const sizeContext = useSizeContext()
    // TODO: use tokens
    const isSmall = sizeContext.lessThan(180)

    const onSettingClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            onSettings?.(id)
        },
        [onSettings, id],
    )

    return (
        <TooltipRenderer
            layoutId="navitem"
            placement="horizontal"
            render={(isSmall && <SpaceNavTooltip id={props.id.slug} name={props.name} />) || <></>}
        >
            {({ triggerProps }) => (
                <NavItem
                    id={id.slug}
                    to={isInvite ? `/invites/${id.slug}/` : `/${PATHS.SPACES}/${id.slug}/`}
                    exact={exact}
                    forceMatch={forceMatch}
                    highlight={highlight}
                    {...triggerProps}
                >
                    {avatar && (
                        <Box position="relative">
                            <SpaceIcon
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

                    {icon && (
                        <Icon type={icon} color="gray2" background="level2" size="square_lg" />
                    )}

                    <ButtonText grow truncate>
                        {isInvite ? '(Invite) ' + name : name}
                    </ButtonText>

                    <Box shrink display={isSmall ? 'none' : undefined} color="gray2">
                        {pinned && <Icon type="pin" size="square_sm" padding="xs" />}
                    </Box>

                    <Box shrink display={isSmall ? 'none' : undefined} color="gray2">
                        <Badge value={mentions} />
                    </Box>

                    {props.spaceName && settings && (
                        <TooltipRenderer
                            trigger="click"
                            placement="horizontal"
                            render={<SpaceSettingsCard spaceId={id} spaceName={props.spaceName} />}
                            layoutId="settings"
                        >
                            {({ triggerProps }) => (
                                <Box
                                    shrink
                                    display={isSmall ? 'none' : undefined}
                                    color={{ hover: 'default', default: 'gray2' }}
                                    onClick={onSettingClick}
                                    {...triggerProps}
                                >
                                    <Icon type="settings" size="square_sm" />
                                </Box>
                            )}
                        </TooltipRenderer>
                    )}
                </NavItem>
            )}
        </TooltipRenderer>
    )
}
