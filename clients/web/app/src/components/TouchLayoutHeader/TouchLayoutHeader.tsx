import React, { useCallback, useMemo, useState } from 'react'
import { useSpaceData, useSpaceMembers, useZionContext } from 'use-zion-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Dot, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useInstallPWAPrompt } from 'hooks/useInstallPWAPrompt'
import { useNavigateToCurrentSpaceInfo } from 'hooks/useNavigateToCurrentSpaceInfo'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { AllChannelsList } from 'routes/AllChannelsList/AllChannelsList'

type Props = {
    onDisplayMainPanel: () => void
}

export const TouchLayoutHeader = (props: Props) => {
    const space = useSpaceData()
    const { members } = useSpaceMembers()
    const { data: topic } = useGetSpaceTopic(space?.id.networkId)
    const currentSpaceId = space?.id

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
        <Box position="relative" paddingX="sm" paddingTop="sm" paddingBottom="md">
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
                justifyContent="center"
                alignItems="center"
                paddingX="sm"
                width="100%"
                gap="sm"
            >
                <Box position="relative">
                    <IconButton
                        icon="bottomAlignedEllipsis"
                        size="square_md"
                        color="default"
                        padding="xs"
                        background="level2"
                        onClick={() => props.onDisplayMainPanel()}
                    />
                    {hasUnread && <Dot />}
                </Box>

                {space ? (
                    <Stack
                        position="relative"
                        overflowX="hidden"
                        gap="sm"
                        padding="sm"
                        width="100%"
                        onClick={onTokenClick}
                    >
                        <Text fontWeight="strong" color="default">
                            {space.name}
                        </Text>
                        <Paragraph truncate color="gray2" size="sm">
                            {`${members.length} member${members.length > 1 ? `s` : ``}`}
                            {topic ? ` · ${topic.toLocaleLowerCase()}` : ``}
                        </Paragraph>
                    </Stack>
                ) : (
                    <Box grow />
                )}

                <Icon
                    type="search"
                    color="default"
                    size="square_lg"
                    padding="xs"
                    onClick={onShowBrowseChannels}
                />

                {visibleModal === 'browse' && (
                    <ModalContainer touchTitle="Browse channels" onHide={onHideBrowseChannels}>
                        <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                    </ModalContainer>
                )}
            </Stack>
        </Box>
    )
}
