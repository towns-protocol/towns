import React, { useCallback, useMemo, useState } from 'react'
import { useSpaceData, useZionContext } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { Box, Dot, IconButton, Stack, Text } from '@ui'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { SpaceIcon } from '@components/SpaceIcon'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { useNavigateToCurrentSpaceInfo } from 'hooks/useNavigateToCurrentSpaceInfo'
import { DirectMessagesModal } from '@components/DirectMessages/DirectMessagesModal'
import { useInstallPWAPrompt } from 'hooks/useInstallPWAPrompt'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'
import { ModalContainer } from '@components/Modals/ModalContainer'

export const TouchLayoutHeader = () => {
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

    const [visibleModal, setVisibleModal] = useState<'browse' | undefined>(undefined)
    const onShowBrowseChannels = useCallback(() => setVisibleModal('browse'), [setVisibleModal])
    const onHideBrowseChannels = useCallback(() => setVisibleModal(undefined), [setVisibleModal])

    return (
        <Box borderBottom paddingTop={shouldDisplayPWAPrompt ? 'none' : 'sm'}>
            {shouldDisplayPWAPrompt && (
                <Box paddingX="sm" paddingBottom="sm">
                    <Stack horizontal centerContent padding border rounded="xs" background="level2">
                        <Text fontWeight="strong" color="default" textAlign="left">
                            Enable notifications on <strong>mobile</strong>:<br /> Tap{' '}
                            <strong>Share</strong> &#8594; <strong>Add to Home Screen</strong>.
                        </Text>
                        <Box grow />
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
                    <IconButton
                        icon="more"
                        size="square_md"
                        color="default"
                        padding="xs"
                        background="level2"
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
                            fadeIn={false}
                        />
                        <Text fontWeight="strong" color="default">
                            {space.name}
                        </Text>
                    </Stack>
                )}
                <Stack grow />
                <IconButton
                    icon="search"
                    background="level2"
                    size="square_md"
                    padding="xs"
                    onClick={onShowBrowseChannels}
                />

                <AnimatePresence>
                    {activeOverlay === 'main-panel' && (
                        <TouchHomeOverlay onClose={() => setActiveOverlay(undefined)} />
                    )}
                    {activeOverlay === 'direct-messages' && (
                        <DirectMessagesModal onHide={() => setActiveOverlay(undefined)} />
                    )}
                </AnimatePresence>

                {visibleModal === 'browse' && (
                    <ModalContainer touchTitle="Browse channels" onHide={onHideBrowseChannels}>
                        <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                    </ModalContainer>
                )}
            </Stack>
        </Box>
    )
}
