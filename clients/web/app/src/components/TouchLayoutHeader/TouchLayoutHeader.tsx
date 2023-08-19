import React, { useCallback } from 'react'
import { Membership, useMyMembership, useSpaceData, useSpaceMembers } from 'use-zion-client'
import { Box, Dot, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import { useNavigateToCurrentSpaceInfo } from 'hooks/useNavigateToCurrentSpaceInfo'
import { useInstallPWAPrompt } from 'hooks/useInstallPWAPrompt'
import { useGetSpaceTopic } from 'hooks/useSpaceTopic'
import { useShowHasUnreadBadgeForOtherSpaces } from 'hooks/useSpaceUnreadsIgnoreMuted'
import { useMuteSettings } from 'api/lib/notificationSettings'

type Props = {
    onDisplayMainPanel: () => void
}

export const TouchLayoutHeader = (props: Props) => {
    const space = useSpaceData()
    const { members } = useSpaceMembers()
    const { data: topic } = useGetSpaceTopic(space?.id.networkId)
    const currentSpaceId = space?.id

    const { navigateToCurrentSpace } = useNavigateToCurrentSpaceInfo()
    const { shouldDisplayPWAPrompt, closePWAPrompt } = useInstallPWAPrompt()

    const hasUnread = useShowHasUnreadBadgeForOtherSpaces(currentSpaceId?.networkId)

    const { spaceIsMuted } = useMuteSettings({
        spaceId: currentSpaceId?.networkId,
    })

    const onTokenClick = useCallback(() => {
        navigateToCurrentSpace()
    }, [navigateToCurrentSpace])

    const myMembership = useMyMembership(space?.id)

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

                {space && myMembership === Membership.Join ? (
                    <Stack
                        position="relative"
                        overflowX="hidden"
                        gap="sm"
                        padding="sm"
                        width="100%"
                        onClick={onTokenClick}
                    >
                        <Stack horizontal gap="sm" alignItems="center">
                            <Text truncate fontWeight="strong" color="default" size="lg">
                                {space.name}
                            </Text>

                            {spaceIsMuted && (
                                <Icon type="muteActive" color="default" size="square_xs" />
                            )}
                        </Stack>
                        <Paragraph truncate color="gray2" size="sm">
                            {`${members.length} member${members.length > 1 ? `s` : ``}`}
                            {topic ? ` · ${topic.toLocaleLowerCase()}` : ``}
                        </Paragraph>
                    </Stack>
                ) : (
                    <Box grow />
                )}

                <IconButton
                    icon="info"
                    color="default"
                    size="square_md"
                    padding="xs"
                    background="none"
                    onClick={onTokenClick}
                />
            </Stack>
        </Box>
    )
}
