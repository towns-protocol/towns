import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
    useChannelData,
    useDMData,
    useMembers,
    useMyUserId,
    useUserLookupContext,
    useZionClient,
} from 'use-zion-client'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { Icon, Stack, Text } from '@ui'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { ConfirmLeaveModal } from '@components/ConfirmLeaveModal/ConfirmLeaveModal'
import { useDevice } from 'hooks/useDevice'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useUserList } from '@components/UserList/UserList'
import { useCreateLink } from 'hooks/useCreateLink'
import {
    DMTitleProperties,
    GDMTitleProperties,
    SetUsernameDisplayName,
} from '@components/SetUsernameDisplayName/SetUsernameDisplayName'
import { ChannelMembersModal } from './SpaceChannelDirectoryPanel'
import { GDMChannelPermissionsModal } from './GDMChannelPermissions'

export const DMChannelInfoPanel = () => {
    const [activeModal, setActiveModal] = useState<
        'members' | 'permissions' | 'confirm-leave' | undefined
    >(undefined)
    const { leaveRoom } = useZionClient()
    const { isTouch } = useDevice()
    const { channel } = useChannelData()
    const { data } = useDMData(channel?.id)
    const { channelSlug } = useParams()
    const { memberIds } = useMembers(channel?.id)
    const { usersMap } = useUserLookupContext()
    const members = useMemo(
        () => memberIds.map((userId) => usersMap[userId]),
        [memberIds, usersMap],
    )

    const myUserId = useMyUserId()

    const navigate = useNavigate()

    const { createLink } = useCreateLink()

    const onClose = useCallback(() => {
        navigate('..')
    }, [navigate])

    const onLeaveClick = useCallback(() => {
        setActiveModal('confirm-leave')
    }, [setActiveModal])

    const onLeaveConfirm = useCallback(async () => {
        if (!channel?.id) {
            return
        }
        await leaveRoom(channel.id)
        setActiveModal(undefined)
        const link = createLink({ route: 'messages' })
        if (link) {
            navigate(link)
        }
    }, [channel?.id, createLink, leaveRoom, navigate])

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.DIRECTORY}`)
        }
    }, [navigate, isTouch])

    const onPermissionsClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('permissions')
        } else {
            navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.PERMISSIONS}`)
        }
    }, [navigate, isTouch])

    const memberNamesExludingSelf = useMemo(() => {
        return members.filter((member) => member.userId !== myUserId).map((m) => m.userId)
    }, [members, myUserId])

    const membersText = useUserList({ userIds: memberNamesExludingSelf }).join('')
    const memberCount = members.length ?? 0

    const usernameProperties = useMemo(() => {
        if (!data) {
            return undefined
        }
        if (data.isGroup) {
            return {
                kind: 'gdm',
            } satisfies GDMTitleProperties
        } else {
            return {
                kind: 'dm',
                counterPartyName: membersText,
            } satisfies DMTitleProperties
        }
    }, [data, membersText])

    const title = data ? (data.isGroup ? 'Group Info' : 'Direct Message') : ''

    return (
        <Panel modalPresentable label={title} onClose={onClose}>
            <DMChannelContextUserLookupProvider
                fallbackToParentContext
                channelId={channelSlug ?? ''}
            >
                <Stack gap padding>
                    {usernameProperties && (
                        <SetUsernameDisplayName titleProperties={usernameProperties} />
                    )}
                    <Stack gap padding background="level2" rounded="sm">
                        <Text fontWeight="medium" color="default">
                            {membersText}
                        </Text>
                    </Stack>
                    <PanelButton onClick={onMembersClick}>
                        <Icon type="people" size="square_sm" color="gray2" />
                        <Text color="default" fontWeight="medium">
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}{' '}
                        </Text>
                    </PanelButton>
                    {data?.isGroup && (
                        <PanelButton onClick={onPermissionsClick}>
                            <Icon type="people" size="square_sm" color="gray2" />
                            <Text color="default" fontWeight="medium">
                                Manage member permissions
                            </Text>
                        </PanelButton>
                    )}
                    <PanelButton onClick={onLeaveClick}>
                        <Icon type="logout" color="error" size="square_sm" />
                        <Text color="error" fontWeight="medium">
                            Leave group
                        </Text>
                    </PanelButton>
                </Stack>
                {activeModal === 'confirm-leave' && (
                    <ConfirmLeaveModal
                        text="Leave group?"
                        onConfirm={onLeaveConfirm}
                        onCancel={() => setActiveModal(undefined)}
                    />
                )}
                {activeModal === 'members' && (
                    <ChannelMembersModal onHide={() => setActiveModal(undefined)} />
                )}
                {activeModal === 'permissions' && (
                    <GDMChannelPermissionsModal onHide={() => setActiveModal(undefined)} />
                )}
            </DMChannelContextUserLookupProvider>
        </Panel>
    )
}
