import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useChannelData,
    useChannelMembers,
    useRoom,
    useSpaceData,
    useZionClient,
} from 'use-zion-client'

import { ChannelSettingsModal } from '@components/ChannelSettings/ChannelSettingsModal'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Icon, Panel, PanelButton, Paragraph, Stack } from '@ui'
import { useHasPermission } from 'hooks/useHasPermission'
import { PATHS } from 'routes'
export const ChannelInfoPanel = () => {
    const { channel } = useChannelData()
    const { members } = useChannelMembers()
    const spaceData = useSpaceData()
    const { data: canEditChannel } = useHasPermission(Permission.ModifySpaceSettings)
    const navigate = useNavigate()
    const { isRoomEncrypted, leaveRoom } = useZionClient()
    const [showChannelSettings, setShowChannelSettings] = useState<boolean>(false)
    const isEncrypted = channel && isRoomEncrypted(channel.id)
    const room = useRoom(channel?.id)

    const onClose = useEvent(() => {
        navigate('..')
    })

    const onLeaveClick = useEvent(async () => {
        if (!channel) {
            return
        }
        await leaveRoom(channel?.id)
        navigate(`/${PATHS.SPACES}/${spaceData?.id.slug}`)
    })

    const onMembersClick = useEvent(() => {
        navigate(
            `/${PATHS.SPACES}/${spaceData?.id.slug}/${PATHS.CHANNELS}/${channel?.id.slug}/info?directory`,
        )
    })

    const onShowChannelSettingsPopup = useEvent(() => {
        setShowChannelSettings(true)
    })

    const onHideChannelSettingsPopup = useEvent(() => {
        setShowChannelSettings(false)
    })

    const onUpdatedChannel = useCallback(() => {
        onHideChannelSettingsPopup()
    }, [onHideChannelSettingsPopup])

    const info = useMemo(
        () => [
            {
                title: 'Description',
                content: `${room?.topic ?? 'No description'}`,
            },
            {
                title: 'Encryption',
                content: `This channel ${isEncrypted ? `is` : `is not`} end-to-end encrypted`,
            },
        ],
        [isEncrypted, room?.topic],
    )

    return (
        <Panel modalPresentable label="Channel Info" onClose={onClose}>
            {showChannelSettings && spaceData && channel?.id && (
                <ChannelSettingsModal
                    spaceId={spaceData?.id}
                    channelId={channel?.id}
                    onHide={onHideChannelSettingsPopup}
                    onUpdatedChannel={onUpdatedChannel}
                />
            )}
            <Stack gap padding="lg">
                <Stack gap padding background="level2" rounded="sm">
                    <Paragraph strong size="lg">
                        #{channel?.label}
                    </Paragraph>
                    <ClipboardCopy label={channel?.id.networkId ?? ''} />
                </Stack>
                {!!info?.length &&
                    info.map((n) => (
                        <Stack padding key={`${n.title}`} background="level2" rounded="sm">
                            <Paragraph strong>{n.title}</Paragraph>
                            <Paragraph color="gray2">{n.content}</Paragraph>
                        </Stack>
                    ))}

                <PanelButton onClick={onMembersClick}>
                    <Icon type="people" />
                    <Paragraph color="default">
                        {`${members.length} member${members.length > 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>

                {canEditChannel && (
                    <PanelButton onClick={onShowChannelSettingsPopup}>
                        <Icon type="edit" />
                        <Paragraph color="default">Edit channel</Paragraph>
                    </PanelButton>
                )}
                <PanelButton tone="negative" onClick={onLeaveClick}>
                    <Icon type="logout" />
                    <Paragraph color="error">Leave #{channel?.label}</Paragraph>
                </PanelButton>
            </Stack>
        </Panel>
    )
}
