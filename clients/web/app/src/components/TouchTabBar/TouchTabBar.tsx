import React from 'react'
import { useMyProfile, useSpaceData } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { Avatar, Box, Icon, Stack, Text } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { PATHS } from 'routes'

export const TouchTabBar = () => {
    const navigate = useNavigate()
    const space = useSpaceData()
    const userId = useMyProfile()?.userId
    if (!space) {
        return null
    }

    const homeButtonPressed = () => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/home`)
    }

    const threadsButtonPressed = () => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/threads`)
    }

    const mentionsButtonPressed = () => {
        navigate(`/${PATHS.SPACES}/${space.id.slug}/mentions`)
    }

    return (
        <Box background="level2" paddingBottom="safeAreaInsetBottom">
            <Stack horizontal width="100%" background="level2" display="flex" paddingY="sm">
                <TabBarItem
                    highlighted
                    title="Home"
                    icon={
                        <SpaceIcon
                            width="toolbar_icon"
                            height="toolbar_icon"
                            spaceId={space?.id.slug}
                            firstLetterOfSpaceName={space?.name[0]}
                            overrideBorderRadius="sm"
                            variant={ImageVariants.thumbnail50}
                            fadeIn={false}
                        />
                    }
                    onClick={homeButtonPressed}
                />
                <TabBarItem
                    title="Threads"
                    icon={<Icon type="message" size="toolbar_icon" />}
                    highlighted={false}
                    onClick={threadsButtonPressed}
                />
                <TabBarItem
                    title="Mentions"
                    icon={<Icon type="at" size="toolbar_icon" />}
                    highlighted={false}
                    onClick={mentionsButtonPressed}
                />
                <TabBarItem
                    title="You"
                    icon={<Avatar size="toolbar_icon" userId={userId} />}
                    highlighted={false}
                />
            </Stack>
        </Box>
    )
}

type TabBarItemProps = {
    title: string
    icon: React.ReactNode
    highlighted: boolean
    onClick?: () => void
}

const TabBarItem = (props: TabBarItemProps) => {
    const { title, icon, highlighted } = props

    return (
        <Stack
            flexGrow="x1"
            alignItems="center"
            color={highlighted ? 'default' : 'gray2'}
            gap="xs"
            onClick={() => {
                props.onClick?.()
            }}
        >
            {icon}
            <Text fontSize="xs">{title}</Text>
        </Stack>
    )
}
