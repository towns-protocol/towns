import React from 'react'
import { useMyProfile, useSpaceData } from 'use-zion-client'
import { Avatar, Box, Icon, Stack, Text } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'

export const TouchTabBar = () => {
    const space = useSpaceData()
    const userId = useMyProfile()?.userId
    if (!space) {
        return null
    }

    return (
        <Box borderTop background="level2" insetBottom="safeArea">
            <Stack horizontal width="100%" background="level2" display="flex" paddingY="sm">
                <TabBarItem
                    highlighted
                    title="Home"
                    icon={
                        <SpaceIcon
                            width="x3"
                            height="x3"
                            spaceId={space?.id.slug}
                            firstLetterOfSpaceName={space?.name[0]}
                            overrideBorderRadius="sm"
                            variant={ImageVariants.thumbnail50}
                            fadeIn={false}
                        />
                    }
                />
                <TabBarItem
                    title="Threads"
                    icon={<Icon type="message" size="square_md" />}
                    highlighted={false}
                />
                <TabBarItem
                    title="Mentions"
                    icon={<Icon type="at" size="square_md" />}
                    highlighted={false}
                />
                <TabBarItem
                    title="You"
                    icon={<Avatar size="avatar_sm" userId={userId} />}
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
