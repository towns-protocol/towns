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
import { Icon, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'

export const ChannelInfoPanel = () => {
    const { channel } = useChannelData()
    const { memberIds } = useChannelMembers()
    const { isTouch } = useDevice()
    const spaceData = useSpaceData()
    const { loggedInWalletAddress } = useAuth()
    const { hasPermission: canEditChannel } = useHasPermission({
        spaceId: spaceData?.id.streamId ?? '',
        channelId: channel?.id.streamId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })
    const navigate = useNavigate()
    const { leaveRoom } = useZionClient()

    const isEncrypted = channel !== undefined
    const room = useRoom(channel?.id)
    const [activeModal, setActiveModal] = useState<'members' | 'settings' | undefined>(undefined)

    const onClose = useEvent(() => {
        navigate('..')
    })

    const onLeaveClick = useEvent(async () => {
        if (!channel || !spaceData) {
            return
        }
        await leaveRoom(channel.id, spaceData.id.streamId)
        navigate(`/${PATHS.SPACES}/${spaceData?.id.streamId}`)
    })

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(
                `/${PATHS.SPACES}/${spaceData?.id.streamId}/${PATHS.CHANNELS}/${channel?.id.streamId}/info?directory`,
            )
        }
    }, [navigate, isTouch, spaceData?.id.streamId, channel?.id.streamId])

    const onShowChannelSettingsPopup = useEvent(() => {
        setActiveModal('settings')
    })

    const onHideChannelSettingsPopup = useEvent(() => {
        setActiveModal(undefined)
    })

    const onUpdatedChannel = useCallback(() => {
        onHideChannelSettingsPopup()
    }, [onHideChannelSettingsPopup])
    const { mutate: mutateNotificationSettings, isLoading: isSettingNotification } =
        useSetMuteSettingForChannelOrSpace()

    const { channelIsMuted, spaceIsMuted, channelMuteSetting } = useMuteSettings({
        spaceId: spaceData?.id.streamId,
        channelId: channel?.id.streamId,
    })

    const onToggleChannelMuted = useCallback(() => {
        if (!spaceData || !channel) {
            return
        }
        mutateNotificationSettings({
            spaceId: spaceData.id.streamId,
            channelId: channel.id.streamId,
            muteSetting: toggleMuteSetting(channelMuteSetting),
        })
    }, [channel, channelMuteSetting, mutateNotificationSettings, spaceData])

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
                    <ClipboardCopy label={channel?.id.streamId ?? ''} />
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
                        {`${memberIds.length} member${memberIds.length > 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>

                {channel && (
                    <>
                        <PanelButton
                            disabled={spaceIsMuted || isSettingNotification}
                            cursor={spaceIsMuted ? 'default' : 'pointer'}
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
