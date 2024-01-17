import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
    GlobalContextUserLookupProvider,
    useChannelId,
    useChannelMembers,
    useZionClient,
} from 'use-zion-client'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Stack } from '@ui'
import { DirectMessageInviteUserList } from '@components/DirectMessages/DirectMessageInviteUserList'
import { ModalContainer } from '@components/Modals/ModalContainer'

const ChannelInvite = (props: { onClose: () => void }) => {
    const { onClose } = props
    const channel = useChannelId()
    const { inviteUser } = useZionClient()

    const { memberIds } = useChannelMembers()
    const currentMemberIds = useMemo(() => new Set<string>(memberIds), [memberIds])
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())

    const onSubmit = useCallback(async () => {
        const userIds = Array.from(selectedUserIds)
        for (const userId of userIds) {
            await inviteUser(channel, userId)
        }
        onClose()
    }, [channel, inviteUser, onClose, selectedUserIds])

    const onSelectionChange = useCallback((selectedUserIds: Set<string>) => {
        setSelectedUserIds(selectedUserIds)
    }, [])

    const onInviteButtonClicked = () => {
        void onSubmit()
    }

    return (
        <>
            <DirectMessageInviteUserList
                isMultiSelect
                hiddenUserIds={currentMemberIds}
                onSelectionChange={onSelectionChange}
            />
            <Box paddingX paddingBottom="md" bottom="none" left="none" right="none">
                <Button
                    disabled={selectedUserIds.size === 0}
                    tone="cta1"
                    onClick={onInviteButtonClicked}
                >
                    {selectedUserIds.size > 1 ? 'Add Members' : 'Add Member'}
                </Button>
            </Box>
        </>
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
            <GlobalContextUserLookupProvider>
                <ChannelInvite onClose={onClose} />
            </GlobalContextUserLookupProvider>
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
