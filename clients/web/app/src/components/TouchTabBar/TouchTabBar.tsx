import React, { useCallback, useMemo } from 'react'
import { useMyProfile, useSpaceData } from 'use-zion-client'
import { matchRoutes, useLocation, useNavigate, useResolvedPath } from 'react-router'
import { Avatar, Box, Dot, Icon, Stack, Text } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { PATHS } from 'routes'
import { useShowHasUnreadBadgeForSpaceId } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { useVisualKeyboardContext } from '../VisualKeyboardContext/VisualKeyboardContext'

export const TouchTabBar = () => {
    const space = useSpaceData()
    const userId = useMyProfile()?.userId
    const hasUnread = useShowHasUnreadBadgeForSpaceId(space?.id.networkId)

    const { visualKeyboardPresent: tabBarHidden } = useVisualKeyboardContext()

    if (!space || tabBarHidden) {
        return null
    }

    return (
        <Box borderTop background="level2" paddingBottom="safeAreaInsetBottom">
            <Stack horizontal width="100%" background="level2" display="flex" paddingY="sm">
                <TabBarItem
                    title="Home"
                    icon={(highlighted: boolean) => (
                        <Box>
                            <SpaceIcon
                                border={highlighted ? 'iconHighlighted' : 'iconIdle'}
                                inset="xxs"
                                width="toolbar_icon"
                                height="toolbar_icon"
                                spaceId={space?.id.slug}
                                firstLetterOfSpaceName={space?.name[0]}
                                overrideBorderRadius="sm"
                                variant={ImageVariants.thumbnail50}
                                fadeIn={false}
                            />
                            {hasUnread && <Dot position="topRight" />}
                        </Box>
                    )}
                    to={`/${PATHS.SPACES}/${space.id.slug}/`}
                    highlightPattern={`${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/*`}
                />
                <TabBarItem
                    title="Threads"
                    icon={() => <Icon type="message" size="toolbar_icon" />}
                    to={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.THREADS}`}
                />
                <TabBarItem
                    title="Mentions"
                    icon={() => <Icon type="at" size="toolbar_icon" />}
                    to={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.MENTIONS}`}
                />
                <TabBarItem
                    title="You"
                    icon={(highlighted) => (
                        <Box rounded="full" border={highlighted ? 'iconHighlighted' : 'iconIdle'}>
                            <Avatar size="toolbar_icon" userId={userId} />
                        </Box>
                    )}
                    to={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.PROFILE}/me`}
                />
            </Stack>
        </Box>
    )
}

type TabBarItemProps = {
    title: string
    to: string
    highlightPattern?: string
    icon: (highlighted: boolean) => React.ReactNode
}

const TabBarItem = (props: TabBarItemProps) => {
    const { title, icon, to } = props
    const location = useLocation()

    const resolved = useResolvedPath(to)
    const navigate = useNavigate()
    const onClick = useCallback(() => {
        navigate(to)
    }, [navigate, to])

    const isHighlighted = useMemo(() => {
        // if "to" matches location.pathname exactly, it's highlighted
        if (decodeURIComponent(location.pathname) === decodeURIComponent(resolved.pathname)) {
            return true
        }
        return props.highlightPattern
            ? // mainly to exclude 'home' "/" from matching all other tabs
              !!matchRoutes([{ path: props.highlightPattern }], location.pathname)?.length
            : // otherwise just check if location.pathname starts with "to"
              decodeURIComponent(location.pathname).startsWith(
                  decodeURIComponent(resolved.pathname),
              )
    }, [location.pathname, props.highlightPattern, resolved.pathname])

    return (
        <Stack
            flexGrow="x1"
            alignItems="center"
            color={isHighlighted ? 'default' : 'gray2'}
            gap="xs"
            onClick={onClick}
        >
            <Box centerContent height="height_md" width="height_md" position="relative">
                {icon(isHighlighted)}
            </Box>
            <Text fontSize="xs" fontWeight="strong">
                {title}
            </Text>
        </Stack>
    )
}
