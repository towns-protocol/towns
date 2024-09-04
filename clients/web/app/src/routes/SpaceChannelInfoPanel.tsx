import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useChannelData,
    useChannelMembers,
    useChannelSettings,
    useConnectivity,
    useHasPermission,
    useRoom,
    useSpaceData,
} from 'use-towns-client'

import { usePrefetchMultipleRoleDetails } from 'use-towns-client/dist/hooks/use-role-details'
import { EditChannelName } from '@components/Panel/EditChannelName'
import { Box, Icon, Paragraph, Stack, Text, TextButton } from '@ui'
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
import { ChannelPermissionsNameDescriptionModal } from '@components/ChannelSettings/ChannelPermissionsNameDescriptionForm'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'
import { usePanelActions } from './layouts/hooks/usePanelActions'
import { ChannelsRolesList } from './RoleRestrictedChannelJoinPanel'

export const ChannelInfoPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <Panel label="Channel Info">
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

    const { hasPermission: canJoinChannel, isLoading: isLoadingCanJoinChannel } = useHasPermission({
        spaceId: spaceData?.id,
        channelId: channel?.id,
        walletAddress: loggedInWalletAddress,
        permission: Permission.Read,
    })

    const { hasPermission: canEditChannel } = useHasPermission({
        spaceId: spaceData?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.AddRemoveChannels,
    })
    const navigate = useNavigate()
    const { leaveChannel } = useLeaveChannel()

    const isUserChannelMember = useMemo(() => {
        return loggedInWalletAddress && memberIds.includes(loggedInWalletAddress)
    }, [loggedInWalletAddress, memberIds])

    const { channelSettings } = useChannelSettings(spaceData?.id ?? '', channel?.id ?? '')

    const roles = channelSettings?.roles
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

    const onOpenEditChannelPermissionsPanel = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.EDIT_CHANNEL_PERMISSIONS)
    })

    const onOpenEditChannelSettingsPanel = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.EDIT_CHANNEL_RIVER_METADATA)
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
                    <EditChannelName
                        canEdit={canEditChannel}
                        name={`#${channel?.label}`}
                        address={channel?.id ?? ''}
                        onEdit={onShowChannelSettingsPopup}
                    />
                </Stack>

                {roles && (
                    <Stack
                        padding
                        elevate
                        data-testid="channel-permission-details"
                        gap="md"
                        background="level2"
                        rounded="sm"
                    >
                        <Stack horizontal justifyContent="spaceBetween">
                            <Paragraph strong truncate color="default">
                                Channel Permissions
                            </Paragraph>
                            {canEditChannel && (
                                <TextButton
                                    data-testid="channel-permission-details-edit-button"
                                    onClick={onOpenEditChannelPermissionsPanel}
                                >
                                    Edit
                                </TextButton>
                            )}
                        </Stack>
                        <Stack horizontal alignItems="center" gap="xs" color="gray2">
                            <Icon type="lock" size="square_sm" color="gray2" />
                            <Text
                                size={{
                                    mobile: 'sm',
                                }}
                            >
                                Only members of these roles can access:
                            </Text>
                        </Stack>
                        <ChannelsRolesList
                            canJoin={canJoinChannel}
                            isLoadingCanJoin={isLoadingCanJoinChannel}
                            roles={roles}
                            headerSubtitle={(r) => r.permissions.join(', ')}
                        />
                    </Stack>
                )}

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
                    <Paragraph color="gray2">{room?.topic || 'No description'}</Paragraph>
                </Stack>
                {!!info?.length &&
                    info.map((n) => (
                        <Stack padding key={`${n.title}`} background="level2" rounded="sm">
                            <Paragraph strong>{n.title}</Paragraph>
                            <Paragraph color="gray2">{n.content}</Paragraph>
                        </Stack>
                    ))}

                <PanelButton disabled={memberIds.length === 0} onClick={onMembersClick}>
                    <Icon type="people" size="square_sm" color="gray2" />
                    <Paragraph color="default">
                        {memberIds.length === 0
                            ? 'No members'
                            : `${memberIds.length} member${memberIds.length > 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>

                {channel && isUserChannelMember && (
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
                                <Paragraph fontWeight="medium" color="default">
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
                    <PanelButton onClick={onOpenEditChannelSettingsPanel}>
                        <Icon type="settings" size="square_sm" color="gray2" />
                        <Paragraph
                            fontWeight="medium"
                            color="default"
                            data-testid="edit-channel-settings-button"
                        >
                            Channel Settings
                        </Paragraph>
                    </PanelButton>
                )}

                {isUserChannelMember && (
                    <PanelButton tone="negative" onClick={onLeaveClick}>
                        <Icon type="logout" size="square_sm" />
                        <Paragraph color="error">Leave #{channel?.label}</Paragraph>
                    </PanelButton>
                )}
            </Stack>

            {activeModal === 'members' && (
                <ChannelMembersModal onHide={onHideChannelSettingsPopup} />
            )}
            {activeModal === 'settings' && spaceData && channel && (
                <ChannelPermissionsNameDescriptionModal onHide={onHideChannelSettingsPopup} />
            )}
        </>
    )
}
