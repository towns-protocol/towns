import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useChannelData,
    useChannelMembers,
    useHasPermission,
    useRoom,
    useSpaceData,
    useZionClient,
} from 'use-zion-client'

import { ChannelSettingsModal } from '@components/ChannelSettings/ChannelSettingsModal'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Icon, Panel, PanelButton, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useMuteSettings } from 'store/useMuteSettings'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'

export const ChannelInfoPanel = () => {
    const { channel } = useChannelData()
    const { members } = useChannelMembers()
    const { isTouch } = useDevice()
    const spaceData = useSpaceData()
    const { loggedInWalletAddress } = useAuth()
    const { hasPermission: canEditChannel } = useHasPermission({
        spaceId: spaceData?.id.networkId ?? '',
        channelId: channel?.id.networkId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })
    const navigate = useNavigate()
    const { isRoomEncrypted, leaveRoom } = useZionClient()

    const isEncrypted = channel && isRoomEncrypted(channel.id)
    const room = useRoom(channel?.id)
    const [activeModal, setActiveModal] = useState<'members' | 'settings' | undefined>(undefined)

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

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(
                `/${PATHS.SPACES}/${spaceData?.id.slug}/${PATHS.CHANNELS}/${channel?.id.slug}/info?directory`,
            )
        }
    }, [navigate, isTouch, spaceData?.id.slug, channel?.id.slug])

    const onShowChannelSettingsPopup = useEvent(() => {
        setActiveModal('settings')
    })

    const onHideChannelSettingsPopup = useEvent(() => {
        setActiveModal(undefined)
    })

    const onUpdatedChannel = useCallback(() => {
        onHideChannelSettingsPopup()
    }, [onHideChannelSettingsPopup])

    const { mutedChannels, setChannelMuted, mutedSpaces } = useMuteSettings()
    const channelIsMuted = channel?.id ? mutedChannels[channel.id.networkId] : false
    const spaceIsMuted = spaceData?.id ? mutedSpaces[spaceData.id.networkId] : false

    const onToggleChannelMuted = useCallback(() => {
        if (!channel) {
            return
        }
        setChannelMuted(channel.id.networkId, !channelIsMuted)
    }, [channel, setChannelMuted, channelIsMuted])

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
                    <Icon type="people" size="square_sm" color="gray2" />
                    <Paragraph color="default">
                        {`${members.length} member${members.length > 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>

                {channel && (
                    <>
                        <PanelButton
                            disabled={spaceIsMuted}
                            opacity={spaceIsMuted ? '0.5' : 'opaque'}
                            onClick={onToggleChannelMuted}
                        >
                            <Icon
                                type={channelIsMuted ? 'muteActive' : 'muteInactive'}
                                size="square_sm"
                                color="gray2"
                            />
                            <Stack gap="sm">
                                <Paragraph color="default">
                                    {spaceIsMuted ? (
                                        spaceData?.name && <>{spaceData?.name} is muted</>
                                    ) : (
                                        <>
                                            {channelIsMuted ? 'Unmute' : 'Mute'} #{channel?.label}
                                        </>
                                    )}
                                </Paragraph>
                            </Stack>
                        </PanelButton>
                    </>
                )}

                {canEditChannel && !isTouch && (
                    <PanelButton onClick={onShowChannelSettingsPopup}>
                        <Icon type="edit" size="square_sm" color="gray2" />
                        <Paragraph color="default">Edit channel</Paragraph>
                    </PanelButton>
                )}
                <PanelButton tone="negative" onClick={onLeaveClick}>
                    <Icon type="logout" size="square_sm" />
                    <Paragraph color="error">Leave #{channel?.label}</Paragraph>
                </PanelButton>
            </Stack>

            {activeModal === 'settings' && spaceData && channel?.id && (
                <ChannelSettingsModal
                    spaceId={spaceData?.id}
                    channelId={channel?.id}
                    onHide={onHideChannelSettingsPopup}
                    onUpdatedChannel={onUpdatedChannel}
                />
            )}

            {activeModal === 'members' && (
                <ChannelMembersModal onHide={onHideChannelSettingsPopup} />
            )}
        </Panel>
    )
}
