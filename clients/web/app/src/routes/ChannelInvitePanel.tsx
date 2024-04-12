import React, { useCallback, useMemo, useState } from 'react'
import {
    GlobalContextUserLookupProvider,
    useChannelId,
    useChannelMembers,
    useTownsClient,
} from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Stack } from '@ui'
import { InviteUserList } from '@components/InviteUserList/InviteUserList'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { usePanelActions } from './layouts/hooks/usePanelActions'

const ChannelInvite = (props: { onClose?: () => void }) => {
    const channel = useChannelId()
    const { inviteUser } = useTownsClient()

    const { memberIds } = useChannelMembers()
    const currentMemberIds = useMemo(() => new Set<string>(memberIds), [memberIds])
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())
    const { closePanel } = usePanelActions()

    const onSubmit = useCallback(async () => {
        const userIds = Array.from(selectedUserIds)
        for (const userId of userIds) {
            await inviteUser(channel, userId)
        }
        if (props.onClose) {
            // only for touch / modal
            props.onClose()
        } else {
            closePanel()
        }
    }, [channel, closePanel, inviteUser, props, selectedUserIds])

    const onSelectionChange = useCallback((selectedUserIds: Set<string>) => {
        setSelectedUserIds(selectedUserIds)
    }, [])

    const onInviteButtonClicked = () => {
        void onSubmit()
    }

    return (
        <>
            <InviteUserList
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
    return (
        <Panel
            padding="none"
            label={
                <Stack horizontal gap="xs">
                    Add New Member
                </Stack>
            }
        >
            <GlobalContextUserLookupProvider>
                <ChannelInvite />
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
