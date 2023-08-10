import React, { useCallback } from 'react'
import { useMyProfile, useSpaceData } from 'use-zion-client'
import { useMatch, useNavigate, useResolvedPath } from 'react-router'
import { Avatar, Box, Icon, Stack, Text } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { PATHS } from 'routes'

export const TouchTabBar = () => {
    const space = useSpaceData()
    const userId = useMyProfile()?.userId
    if (!space) {
        return null
    }

    return (
        <Box borderTop background="level2" paddingBottom="safeAreaInsetBottom">
            <Stack horizontal width="100%" background="level2" display="flex" paddingY="sm">
                <TabBarItem
                    title="Home"
                    icon={(highlighted: boolean) => (
                        <Box
                            background={highlighted ? 'transparentBright' : 'none'}
                            rounded="sm"
                            padding="xxs"
                        >
                            <SpaceIcon
                                width="toolbar_icon"
                                height="toolbar_icon"
                                spaceId={space?.id.slug}
                                firstLetterOfSpaceName={space?.name[0]}
                                overrideBorderRadius="sm"
                                variant={ImageVariants.thumbnail50}
                                fadeIn={false}
                            />
                        </Box>
                    )}
                    to={`/${PATHS.SPACES}/${space.id.slug}/${PATHS.HOME}`}
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
                        <Box
                            rounded="full"
                            background={highlighted ? 'transparentBright' : 'none'}
                            padding="xxs"
                        >
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
    icon: (highlighted: boolean) => React.ReactNode
}

const TabBarItem = (props: TabBarItemProps) => {
    const { title, icon, to } = props
    const resolved = useResolvedPath(to)
    const navigate = useNavigate()
    const onClick = useCallback(() => {
        navigate(to)
    }, [navigate, to])

    const match = useMatch({
        path: resolved.pathname,
    })
    const isHighlighted = !!match

    return (
        <Stack
            flexGrow="x1"
            alignItems="center"
            color={isHighlighted ? 'default' : 'gray2'}
            gap="xs"
            onClick={onClick}
        >
            <Box centerContent height="height_md">
                {icon(isHighlighted)}
            </Box>
            <Text fontSize="xs" fontWeight="strong">
                {title}
            </Text>
        </Stack>
    )
}
