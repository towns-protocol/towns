import React, { useCallback, useMemo, useState } from 'react'
import { useMyProfile, useSpaceData, useZionContext } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { Avatar, Box, Dot, IconButton, Stack, Text } from '@ui'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { SpaceIcon } from '@components/SpaceIcon'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { useNavigateToCurrentSpaceInfo } from 'hooks/useNavigateToCurrentSpaceInfo'
import { DirectMessagesModal } from '@components/DirectMessages/DirectMessagesModal'
import { useInstallPWAPrompt } from 'hooks/useInstallPWAPrompt'

export const TouchLayoutHeader = () => {
    const userId = useMyProfile()?.userId
    const space = useSpaceData()
    const currentSpaceId = space?.id
    const [activeOverlay, setActiveOverlay] = useState<
        'main-panel' | 'direct-messages' | undefined
    >(undefined)

    const { navigateToCurrentSpace } = useNavigateToCurrentSpaceInfo()
    const { spaces, spaceUnreads, spaceMentions } = useZionContext()
    const { shouldDisplayPWAPrompt, closePWAPrompt } = useInstallPWAPrompt()

    const hasUnread = useMemo(() => {
        return spaces.some((space) => {
            if (space.id.networkId === currentSpaceId?.networkId) {
                return false
            }
            return spaceUnreads[space.id.networkId] || spaceMentions[space.id.networkId]
        }, 0)
    }, [spaceUnreads, spaceMentions, currentSpaceId, spaces])

    const onTokenClick = useCallback(() => {
        navigateToCurrentSpace()
    }, [navigateToCurrentSpace])

    return (
        <Box borderBottom paddingTop={shouldDisplayPWAPrompt ? 'none' : 'sm'}>
            {shouldDisplayPWAPrompt && (
                <Box paddingBottom="sm">
                    <Stack horizontal centerContent padding="md" gap="lg" background="level3">
                        <Text fontWeight="strong" color="default" textAlign="center">
                            To use the Towns app, open in <strong>Safari</strong>, tap{' '}
                            <strong>Share</strong> &#8594; <strong>Add to Home Screen</strong>.
                        </Text>
                        <IconButton icon="close" onClick={closePWAPrompt} />
                    </Stack>
                </Box>
            )}
            <Stack
                horizontal
                paddingX="md"
                width="100%"
                background="level1"
                alignItems="center"
                zIndex="tooltips"
                paddingTop="safeAreaInsetTop"
                paddingY="sm"
            >
                <Box position="relative">
                    <Avatar
                        size="avatar_x4"
                        userId={userId}
                        onClick={() => setActiveOverlay('main-panel')}
                    />
                    {hasUnread && <Dot />}
                </Box>
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
                            firstLetterOfSpaceName={space?.name[0]}
                            overrideBorderRadius="sm"
                            variant={ImageVariants.thumbnail50}
                        />
                        <Text fontWeight="strong" color="default">
                            {space.name}
                        </Text>
                    </Stack>
                )}
                <Stack grow />
                <Box width="x4" />
                <AnimatePresence>
                    {activeOverlay === 'main-panel' && (
                        <TouchHomeOverlay onClose={() => setActiveOverlay(undefined)} />
                    )}
                    {activeOverlay === 'direct-messages' && (
                        <DirectMessagesModal onHide={() => setActiveOverlay(undefined)} />
                    )}
                </AnimatePresence>
            </Stack>
        </Box>
    )
}
