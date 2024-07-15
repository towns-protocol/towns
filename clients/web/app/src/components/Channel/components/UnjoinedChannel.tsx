import React, { useCallback } from 'react'
import { Permission, useConnectivity, useHasPermission, useTownsClient } from 'use-towns-client'
import { ChannelHeader } from '@components/ChannelHeader/ChannelHeader'
import { Box, Button, Heading, Icon, Paragraph } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useChannelEntitlements } from 'hooks/useChannelEntitlements'

export const UnjoinedChannelComponent = (props: {
    hideHeader?: boolean
    spaceId?: string
    channel: { id: string; label: string; topic?: string }
}) => {
    const { channel } = props
    const channelId = channel.id
    const { hideHeader, spaceId } = props
    const { joinRoom } = useTownsClient()
    const { loggedInWalletAddress } = useConnectivity()
    const { openPanel } = usePanelActions()

    const { hasPermission: canJoinChannel } = useHasPermission({
        walletAddress: loggedInWalletAddress,
        spaceId: spaceId,
        channelId: channelId,
        permission: Permission.Read,
    })

    const { hasSomeEntitlement } = useChannelEntitlements({
        spaceId: props.spaceId,
        channelId: props.channel.id,
    })

    const onJoinChannel = useCallback(() => {
        if (!canJoinChannel) {
            openPanel(CHANNEL_INFO_PARAMS.ROLE_RESTRICTED_CHANNEL_JOIN, {
                data: channelId,
            })
            return
        }
        if (channelId) {
            joinRoom(channelId)
        }
    }, [joinRoom, channelId, openPanel, canJoinChannel])

    return (
        <>
            {!hideHeader && <ChannelHeader channel={channel} spaceId={spaceId} />}
            <Box absoluteFill centerContent padding="lg">
                <Box centerContent gap="md">
                    <Box padding="md" color="gray2" background="level2" rounded="sm">
                        <Icon type={hasSomeEntitlement ? 'lock' : 'tag'} size="square_sm" />
                    </Box>
                    <Box centerContent gap="sm">
                        <Heading level={3}>Join #{channel.label}</Heading>
                        <Paragraph textAlign="center" color="gray2">
                            You aren’t a member yet. Join to get access:
                        </Paragraph>
                    </Box>
                    <Button
                        hoverEffect="none"
                        minWidth="100"
                        rounded="sm"
                        size="button_sm"
                        tone="cta1"
                        onClick={onJoinChannel}
                    >
                        Join Channel
                    </Button>
                </Box>
            </Box>
        </>
    )
}
