import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useChannelData, useDMData, useMembers, useMyUserId, useZionClient } from 'use-zion-client'
import { Icon, Stack, Text } from '@ui'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { ConfirmLeaveModal } from '@components/ConfirmLeaveModal/ConfirmLeaveModal'
import { useDevice } from 'hooks/useDevice'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useUserList } from '@components/UserList/UserList'
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

    const members = useMembers(channel?.id)
    const myUserId = useMyUserId()

    const navigate = useNavigate()
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
    }, [channel, leaveRoom])

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
        return members.members?.filter((member) => member.userId !== myUserId).map((m) => m.userId)
    }, [members, myUserId])

    const membersText = useUserList({ userIds: memberNamesExludingSelf }).join('')

    const memberCount = members?.members.length ?? 0

    return (
        <Panel modalPresentable label="Group info" onClose={onClose}>
            <Stack gap padding>
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
        </Panel>
    )
}
