import { useMyUserId, useSpaceNotificationCounts } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import React, { useCallback } from 'react'
import { SpaceIcon } from '@components/SpaceIcon'
import { Badge, Box, ButtonText, Dot, Icon, MotionBox } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { useShowHasUnreadBadgeForSpaceId } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { IconName } from 'ui/components/Icon'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { vars } from 'ui/styles/vars.css'
import { useUserStore } from 'store/userSettingsStore'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    spaceName: string
    badge?: JSX.Element
    icon?: IconName
    forceMatch?: boolean
    highlight?: boolean
    pinned?: boolean
    settings?: boolean
    onSettings?: (id: string) => void
    exact?: boolean
    isInvite?: boolean
    disabled?: boolean
    onClick?: () => void
}

export const SpaceNavItem = (props: Props) => {
    const { id, spaceName, forceMatch, highlight, exact, icon, pinned, isInvite } = props

    const { isTouch } = useDevice()
    const notificationCounts = useSpaceNotificationCounts(id)
    const mentions = notificationCounts.mentions
    const newMessages = useShowHasUnreadBadgeForSpaceId(id)
    const sizeContext = useSizeContext()
    // TODO: use tokens
    const isSmall = sizeContext.lessThan(180)

    const [isHovered, setIsHovered] = React.useState(false)
    const onMouseEnter = useCallback(() => setIsHovered(true), [])
    const onMouseLeave = useCallback(() => setIsHovered(false), [])

    const userId = useMyUserId()

    const [setFavoriteSpaces, favoriteSpaces] = useUserStore((s) => [
        s.setFavoriteSpaces,
        (userId && s.users[userId]?.favoriteSpaces) || [],
    ])

    const onToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!userId) {
            return
        }
        setFavoriteSpaces(
            userId,
            favoriteSpaces.includes(id)
                ? favoriteSpaces.filter((f) => f !== id)
                : [id, ...favoriteSpaces],
        )
    }

    return (
        <NavItem
            id={id}
            exact={exact}
            forceMatch={forceMatch}
            activeBackground={isTouch ? 'level2' : 'level3'}
            highlight={highlight}
            cursor="pointer"
            style={{ touchAction: 'none', userSelect: 'none' }}
            tooltip={isTouch ? undefined : spaceName}
            tooltipOptions={{
                placement: 'horizontal',
                immediate: true,
                disabled: isTouch || props.disabled,
            }}
            onClick={props.onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
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
                    firstLetterOfSpaceName={spaceName?.[0] ?? ''}
                />
                <AnimatePresence mode="sync">
                    {isHovered ? (
                        <MotionBox
                            key="star"
                            position="topRight"
                            initial={{
                                x: `50%`,
                                y: `-50%`,
                                scale: 0.5,
                                ['color' as string]: vars.color.foreground.default,
                                ['--background' as string]: favoriteSpaces.includes(id)
                                    ? vars.color.foreground.default
                                    : vars.color.background.level1,
                            }}
                            animate={{ x: `50%`, y: `-50%`, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            whileHover={{
                                ['color' as string]: vars.color.foreground.default,
                                ['--background' as string]: favoriteSpaces.includes(id)
                                    ? vars.color.background.level1
                                    : vars.color.foreground.default,
                                scale: favoriteSpaces.includes(id) ? 0.9 : 1.1,
                            }}
                            onClick={onToggleFavorite}
                        >
                            <MotionBox {...motionPreset}>
                                <Icon
                                    type="starFilledOutline"
                                    size="square_xs"
                                    style={{
                                        filter: 'drop-shadow(-2px 2px 3px #000F)',
                                    }}
                                />
                            </MotionBox>
                        </MotionBox>
                    ) : newMessages ? (
                        <Dot position="topRight" style={{ transform: `translate(25%,-25%)` }} />
                    ) : (
                        <></>
                    )}
                </AnimatePresence>
            </Box>

            {icon && <Icon type={icon} color="gray2" background="level2" size="square_lg" />}

            <ButtonText grow truncate color="default">
                {isInvite ? '(Invite) ' + spaceName : spaceName}
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

const motionPreset = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
}
