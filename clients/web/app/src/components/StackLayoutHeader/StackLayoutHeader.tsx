import React, { useCallback, useState } from 'react'
import { useMatrixCredentials, useSpaceData } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { Avatar, Box, Stack, Text } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { StackHomeOverlay } from '@components/StackHomeOverlay/StackHomeOverlay'
import { useNavigateToCurrentSpaceInfo } from 'hooks/useNavigateToCurrentSpaceInfo'

export const StackLayoutHeader = () => {
    const { userId } = useMatrixCredentials()
    const space = useSpaceData()
    const [showOverlay, setShowOverlay] = useState(false)
    const { navigateToCurrentSpace } = useNavigateToCurrentSpaceInfo()

    const onTokenClick = useCallback(() => {
        navigateToCurrentSpace()
    }, [navigateToCurrentSpace])

    return (
        <Stack
            horizontal
            borderBottom
            paddingY="sm"
            paddingX="lg"
            width="100%"
            background="level1"
            alignItems="center"
            zIndex="tooltips"
        >
            <Avatar size="avatar_x4" userId={userId} onClick={() => setShowOverlay(true)} />
            <Stack grow />
            {space && (
                <Stack
                    horizontal
                    border
                    gap="paragraph"
                    padding="sm"
                    background="level2"
                    rounded="sm"
                    alignItems="center"
                    onClick={onTokenClick}
                >
                    <SpaceIcon
                        height="height_md"
                        width="height_md"
                        spaceId={space?.id.slug}
                        firstLetterOfSpaceName=""
                        overrideBorderRadius="sm"
                        variant={ImageVariants.thumbnail50}
                    />
                    <Text fontWeight="strong" color="default">
                        {space.name}
                    </Text>
                </Stack>
            )}
            <Stack grow />
            <Box background="cta1" width="x3" height="x3" />
            <AnimatePresence>
                {showOverlay && <StackHomeOverlay onClose={() => setShowOverlay(false)} />}
            </AnimatePresence>
        </Stack>
    )
}
