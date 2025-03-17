import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    useChannelData,
    useChannelMembers,
    useChannelSettings,
    useChannelWithId,
    useConnectivity,
    useHasPermission,
    usePermissionOverrides,
    usePrefetchMultipleRoleDetails,
    useSpaceData,
    useStreamEncryptionAlgorithm,
} from 'use-towns-client'
import { EditChannelName } from '@components/Panel/EditChannelName'
import { Box, Icon, Paragraph, Stack, Text, TextButton, Toggle } from '@ui'
import { CHANNEL_INFO_PARAMS, PATHS } from 'routes'
import { useDevice } from 'hooks/useDevice'
import { PanelButton } from '@components/Panel/PanelButton'
import { Panel } from '@components/Panel/Panel'

import { useLeaveChannel } from 'hooks/useLeaveChannel'
import { ChannelPermissionsNameDescriptionModal } from '@components/ChannelSettings/ChannelPermissionsNameDescriptionForm'

import { atoms } from 'ui/styles/atoms.css'
import {
    channelPermissionDescriptions,
    isChannelPermission,
} from '@components/SpaceSettingsPanel/rolePermissions.const'
import { TownNotificationsButton } from '@components/NotificationSettings/NotificationsSettingsButton'
import { useChannelEntitlements } from 'hooks/useChannelEntitlements'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { ChannelMembersModal } from '../components/ChannelMembersPanel/ChannelMembersPanel'
import { usePanelActions } from './layouts/hooks/usePanelActions'
import { ChannelsRolesList } from './RoleRestrictedChannelJoinPanel'

export const ChannelInfoPanel = React.memo(() => {
    return (
        <Panel label="Channel Info">
            <ChannelInfo />
        </Panel>
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

    const { hasPermission: canEditRoles } = useHasPermission({
        spaceId: spaceData?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

    const navigate = useNavigate()
    const { leaveChannel } = useLeaveChannel()

    const isUserChannelMember = useMemo(() => {
        return loggedInWalletAddress && memberIds.includes(loggedInWalletAddress)
    }, [loggedInWalletAddress, memberIds])

    const { channelSettings } = useChannelSettings(spaceData?.id ?? '', channel?.id ?? '')
    const { streamEncryptionAlgorithm, setEncryptionAlgorithm } = useStreamEncryptionAlgorithm(
        channel?.id,
    )
    const { name: environmentName } = useEnvironment()
    const showEncryptionAlgorithmSettings =
        environmentName === 'alpha' || environmentName === 'gamma' || environmentName === 'delta'
    const { hasSomeEntitlement } = useChannelEntitlements({
        spaceId: spaceData?.id,
        channelId: channel?.id,
    })

    const roles = channelSettings?.roles
    const roledIds = useMemo(() => roles?.map((r) => r.roleId) ?? [], [roles])
    usePrefetchMultipleRoleDetails(spaceData?.id, roledIds)

    const channelExists = channel !== undefined
    const room = useChannelWithId(channel?.id)
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

    const info = useMemo(
        () => [
            {
                title: 'Encryption',
                content: `This channel ${channelExists ? `is` : `is not`} end-to-end encrypted`,
            },
        ],
        [channelExists],
    )

    const onEditRolePermissions = useCallback(
        (roleId: number) => {
            openPanel(CHANNEL_INFO_PARAMS.EDIT_CHANNEL_PERMISSION_OVERRIDES, {
                channelId: channel?.id ?? '',
                roleId: roleId.toString(),
            })
        },
        [channel?.id, openPanel],
    )
    const spaceId = spaceData?.id
    const channelId = channel?.id

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
                        {hasSomeEntitlement && (
                            <Stack horizontal alignItems="center" gap="xs" color="gray2">
                                <Icon type="lock" size="square_xs" color="gray2" />
                                <Text
                                    size={{
                                        mobile: 'sm',
                                    }}
                                >
                                    Only members of these roles can access:
                                </Text>
                            </Stack>
                        )}
                        <ChannelsRolesList
                            spaceId={spaceId}
                            canJoin={canJoinChannel}
                            isLoadingCanJoin={isLoadingCanJoinChannel}
                            roles={roles}
                            headerSubtitle={(role) =>
                                spaceId && channelId ? (
                                    <PermissionText
                                        spaceId={spaceId}
                                        channelId={channelId}
                                        roleId={role.roleId}
                                        permissions={role.permissions}
                                        showDiff={canEditRoles}
                                        key={role.roleId}
                                    />
                                ) : (
                                    role.permissions
                                        .map((p) => channelPermissionDescriptions[p]?.name ?? p)
                                        .join(', ')
                                )
                            }
                            onEditRolePermissions={canEditRoles ? onEditRolePermissions : undefined}
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
                {channelId && (
                    <TownNotificationsButton
                        type="channel"
                        spaceId={spaceId}
                        channelId={channelId}
                    />
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

                {channelExists && showEncryptionAlgorithmSettings && (
                    <Stack gap padding background="level2" rounded="sm">
                        <Paragraph fontWeight="medium" color="default">
                            Encryption Algorithm
                        </Paragraph>

                        <Stack horizontal alignItems="center">
                            <Paragraph color="gray2" fontWeight="medium">
                                Enable MLS
                            </Paragraph>
                            <Box grow />
                            <Toggle
                                toggled={streamEncryptionAlgorithm == 'mls_0.0.1'}
                                onToggle={(toggled) =>
                                    setEncryptionAlgorithm(toggled ? 'mls_0.0.1' : undefined)
                                }
                            />
                        </Stack>

                        <Stack horizontal alignItems="center">
                            <Paragraph color="gray2" fontWeight="medium">
                                Enable Hybrid Group Encryption
                            </Paragraph>
                            <Box grow />
                            <Toggle
                                toggled={streamEncryptionAlgorithm == 'grpaes'}
                                onToggle={(toggled) =>
                                    setEncryptionAlgorithm(toggled ? 'grpaes' : undefined)
                                }
                            />
                        </Stack>

                        <Paragraph color="gray2" size="sm">
                            This setting is used on Gamma and Alpha for debugging MLS.
                        </Paragraph>
                    </Stack>
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

const PermissionText = (props: {
    spaceId: string
    roleId: number
    channelId: string
    permissions: Permission[]
    showDiff?: boolean
}) => {
    const { spaceId, roleId, channelId, permissions, showDiff } = props
    const { permissions: permissionOverrides } = usePermissionOverrides(spaceId, channelId, roleId)

    const result = useMemo(() => {
        if (!showDiff || !permissionOverrides) {
            // keep original order if there's not diff to show
            return {
                union: permissionOverrides ?? permissions,
                removed: [] as Permission[],
                added: [] as Permission[],
            }
        }

        const sets = {
            intersection: permissions.filter((p) => permissionOverrides?.includes(p)),
            removed: permissions.filter((p) => !permissionOverrides?.includes(p)),
            added: permissionOverrides?.filter((p) => !permissions.includes(p)) ?? [],
        }

        return {
            ...sets,
            union: [...sets.intersection, ...sets.removed, ...sets.added],
        }
    }, [showDiff, permissionOverrides, permissions])

    return (
        <Paragraph color="gray2" size="sm">
            {result.union.filter(isChannelPermission).map((p, index, arr) => {
                const className =
                    !showDiff || !permissionOverrides
                        ? ''
                        : atoms({
                              color: result.added.includes(p) ? 'default' : 'gray2',
                              textDecoration: result.removed.includes(p) ? 'lineThrough' : 'none',
                          })
                return (
                    <>
                        <span key={p} className={className}>
                            {channelPermissionDescriptions[p]?.name ?? p}
                        </span>
                        {index < arr.length - 1 && ', '}
                    </>
                )
            })}
        </Paragraph>
    )
}
