import React, { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useChannelId, useChannelMembers, useZionClient } from 'use-zion-client'
import { Panel } from '@components/Panel/Panel'
import { Stack } from '@ui'
import { DirectMessageInviteUserList } from '@components/DirectMessages/DirectMessageInviteUserList'
import { ModalContainer } from '@components/Modals/ModalContainer'

const ChannelInvite = (props: { onClose: () => void }) => {
    const { onClose } = props
    const channel = useChannelId()
    const { inviteUser } = useZionClient()
    const { members } = useChannelMembers()
    const currentMemberIds = useMemo(() => new Set<string>(members.map((m) => m.userId)), [members])
    const onInviteButtonClicked = useCallback(
        async (selectedUserIds: Set<string>) => {
            const userIds = Array.from(selectedUserIds)
            for (const userId of userIds) {
                await inviteUser(channel, userId)
            }
            onClose()
        },
        [channel, inviteUser, onClose],
    )

    return (
        <DirectMessageInviteUserList
            hiddenUserIds={currentMemberIds}
            submitButtonTextSingleUser="Add Member"
            submitButtonTextMultipleUsers="Add Members"
            onSubmit={onInviteButtonClicked}
        />
    )
}

export const ChannelInvitePanel = () => {
    const navigate = useNavigate()
    const onClose = useCallback(() => {
        navigate('..')
    }, [navigate])

    return (
        <Panel
            label={
                <Stack horizontal gap="xs">
                    Add New Member
                </Stack>
            }
            onClose={onClose}
        >
            <ChannelInvite onClose={onClose} />
        </Panel>
    )
}

export const ChannelInviteModal = (props: { onHide: () => void }) => {
    const { onHide } = props
    return (
        <ModalContainer touchTitle="Add Members" onHide={onHide}>
            <ChannelInvite onClose={onHide} />
        </ModalContainer>
    )
}
