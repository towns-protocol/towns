import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useChannelData,
    useChannelMembers,
    useConnectivity,
    useHasPermission,
    useRoom,
    useSpaceData,
} from 'use-towns-client'

import { usePrefetchMultipleRoleDetails } from 'use-towns-client/dist/hooks/use-role-details'
import { Box, Icon, Paragraph, Stack, TextButton } from '@ui'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { useDevice } from 'hooks/useDevice'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { PanelButton } from '@components/Panel/PanelButton'
import { Panel } from '@components/Panel/Panel'

import { useLeaveChannel } from 'hooks/useLeaveChannel'
import { EditSpaceName } from '@components/Panel/EditSpaceName'
import { ChannelSettingsModal } from '@components/ChannelSettings/ChannelSettings'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useContractRoles } from 'hooks/useContractRoles'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const ChannelInfoPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <Panel modalPresentable label="Channel Info">
                <ChannelInfo />
            </Panel>
        </PrivyWrapper>
    )
})

export const ChannelInfo = () => {
    const { channel } = useChannelData()
    const { memberIds } = useChannelMembers()
    const { isTouch } = useDevice()
    const spaceData = useSpaceData()
    const { loggedInWalletAddress } = useConnectivity()
    const { hasPermission: canEditChannel } = useHasPermission({
        spaceId: spaceData?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })
    const navigate = useNavigate()
    const { leaveChannel } = useLeaveChannel()

    const { data: roles } = useContractRoles(spaceData?.id)
    const roledIds = useMemo(() => roles?.map((r) => r.roleId) ?? [], [roles])
    usePrefetchMultipleRoleDetails(spaceData?.id, roledIds)

    const isEncrypted = channel !== undefined
    const room = useRoom(channel?.id)
    const [activeModal, setActiveModal] = useState<'members' | 'settings' | undefined>(undefined)

    const onLeaveClick = useEvent(async () => {
        if (!channel || !spaceData) {
            return
        }
        await leaveChannel(channel.id, spaceData.id)
        navigate(`/${PATHS.SPACES}/${spaceData?.id}`)
    })

    const { openPanel } = usePanelActions()

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            openPanel(CHANNEL_INFO_PARAMS.DIRECTORY)
        }
    }, [isTouch, openPanel])

    const onShowChannelSettingsPopup = useEvent(() => {
        setActiveModal('settings')
    })

    const onHideChannelSettingsPopup = useEvent(() => {
        setActiveModal(undefined)
    })

    const onOpenChannelSettingsPanel = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.EDIT_CHANNEL)
    })

    const { mutate: mutateNotificationSettings, isPending: isSettingNotification } =
        useSetMuteSettingForChannelOrSpace()

    const { channelIsMuted, spaceIsMuted, channelMuteSetting } = useMuteSettings({
        spaceId: spaceData?.id,
        channelId: channel?.id,
    })

    const onToggleChannelMuted = useCallback(() => {
        if (!spaceData || !channel) {
            return
        }
        mutateNotificationSettings({
            spaceId: spaceData.id,
            channelId: channel.id,
            muteSetting: toggleMuteSetting(channelMuteSetting),
        })
    }, [channel, channelMuteSetting, mutateNotificationSettings, spaceData])

    const info = useMemo(
        () => [
            {
                title: 'Encryption',
                content: `This channel ${isEncrypted ? `is` : `is not`} end-to-end encrypted`,
            },
        ],
        [isEncrypted],
    )

    return (
        <>
            <Stack gap>
                <Stack gap padding background="level2" rounded="sm">
                    <EditSpaceName
                        canEdit={canEditChannel}
                        name={`#${channel?.label}`}
                        address={channel?.id ?? ''}
                        onEdit={onShowChannelSettingsPopup}
                    />
                </Stack>

                <Stack gap padding background="level2" rounded="sm">
                    <Stack horizontal alignItems="center" width="100%">
                        <Paragraph strong truncate color="default">
                            {'Description'}
                        </Paragraph>
                        <Box grow />
                        {canEditChannel && (
                            <TextButton onClick={onShowChannelSettingsPopup}>Edit</TextButton>
                        )}
                    </Stack>
                    <Paragraph color="gray2">{room?.topic ?? 'No description'}</Paragraph>
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

                {canEditChannel && (
                    <PanelButton onClick={onOpenChannelSettingsPanel}>
                        <Icon type="edit" size="square_sm" color="gray2" />
                        <Paragraph color="default">Edit channel permissions</Paragraph>
                    </PanelButton>
                )}
                <PanelButton tone="negative" onClick={onLeaveClick}>
                    <Icon type="logout" size="square_sm" />
                    <Paragraph color="error">Leave #{channel?.label}</Paragraph>
                </PanelButton>
            </Stack>

            {activeModal === 'members' && (
                <ChannelMembersModal onHide={onHideChannelSettingsPopup} />
            )}
            {activeModal === 'settings' && spaceData && channel && (
                <ChannelSettingsModal onHide={onHideChannelSettingsPopup} />
            )}
        </>
    )
}
