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
import { ToneName } from 'ui/styles/themes'
import { NavItem } from './_NavItem'

type Props = {
    id: string
    spaceName: string
    badge?: JSX.Element
    icon?: IconName
    forceMatch?: boolean
    highlight?: boolean
    settings?: boolean
    onSettings?: (id: string) => void
    exact?: boolean
    isInvite?: boolean
    disabled?: boolean
    onClick?: () => void
}

export const SpaceNavItem = (props: Props) => {
    const { id, spaceName, forceMatch, highlight, exact, icon, isInvite } = props

    const { isTouch } = useDevice()
    const userId = useMyUserId()
    const notificationCounts = useSpaceNotificationCounts(id)
    const mentions = notificationCounts.mentions
    const newMessages = useShowHasUnreadBadgeForSpaceId(id)
    const sizeContext = useSizeContext()
    const isSmall = sizeContext.lessThan(180)

    const [setFavoriteSpaces, favoriteSpaces] = useUserStore((s) => [
        s.setFavoriteSpaces,
        (userId && s.users[userId]?.favoriteSpaces) || [],
    ])

    const isFavorite = favoriteSpaces.includes(id)

    const onToggleFavorite = useCallback(() => {
        if (!userId) {
            return
        }
        setFavoriteSpaces(
            userId,
            favoriteSpaces.includes(id)
                ? favoriteSpaces.filter((f) => f !== id)
                : [id, ...favoriteSpaces],
        )
    }, [favoriteSpaces, id, setFavoriteSpaces, userId])

    const [isHovered, setIsHovered] = React.useState(false)
    const onMouseEnter = useCallback(() => setIsHovered(true), [])
    const onMouseLeave = useCallback(() => setIsHovered(false), [])
    const onStarTap = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onToggleFavorite()
        },
        [onToggleFavorite],
    )

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
                {!isTouch && (
                    <IconNotification
                        spaceId={id}
                        hasUnread={newMessages}
                        isHovered={isHovered}
                        isFavorite={isFavorite}
                        onToggleFavorite={onToggleFavorite}
                    />
                )}
            </Box>

            {icon && <Icon type={icon} color="gray2" background="level2" size="square_lg" />}

            <ButtonText grow truncate color="default">
                {isInvite ? '(Invite) ' + spaceName : spaceName}
            </ButtonText>

            <Box shrink display={isSmall ? 'none' : undefined} color="gray2">
                <Badge value={mentions} />
            </Box>
            <Box
                shrink
                display={isSmall ? 'none' : undefined}
                color={favoriteSpaces.includes(id) ? 'default' : 'gray2'}
                onClick={onStarTap}
            >
                <Icon type={favoriteSpaces.includes(id) ? 'starFilled' : 'star'} size="square_xs" />
            </Box>
        </NavItem>
    )
}

const IconNotification = (props: {
    spaceId: string
    hasUnread: boolean
    isFavorite: boolean
    isHovered: boolean
    onToggleFavorite: () => void
}) => {
    const { hasUnread, isFavorite, isHovered, onToggleFavorite } = props
    const onClick = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onToggleFavorite()
        },
        [onToggleFavorite],
    )

    return (
        <AnimatePresence mode="wait">
            {isHovered || isFavorite ? (
                <MotionBox
                    key="star"
                    position="topRight"
                    initial={{
                        scale: 0.5,
                        x: `40%`,
                        y: `-40%`,
                    }}
                    animate={{
                        scale: 1,
                        ['color' as string]: hasUnread
                            ? vars.color.foreground[ToneName.Accent]
                            : isFavorite
                            ? vars.color.foreground.gray2
                            : vars.color.foreground.gray2,
                        ['--background' as string]: vars.color.background.level1,
                    }}
                    whileHover={{
                        scale: isFavorite ? 0.9 : 1.2,
                    }}
                    onClick={onClick}
                    {...motionPreset}
                >
                    <Icon type="starFilledOutline" size="square_sm" />
                </MotionBox>
            ) : hasUnread ? (
                <MotionBox
                    position="topRight"
                    key="dot"
                    initial={{ x: '30%', y: '-30%', scale: 0.5 }}
                    animate={{ scale: 1 }}
                    {...motionPreset}
                >
                    <Dot />
                </MotionBox>
            ) : (
                <></>
            )}
        </AnimatePresence>
    )
}

const motionPreset = { transition: { type: 'spring', stiffness: 200, damping: 20 } }
