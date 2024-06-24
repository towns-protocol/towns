import React, { useCallback, useMemo, useState } from 'react'
import {
    useChannelId,
    useChannelMembers,
    useTownsClient,
    useUserLookupArray,
} from 'use-towns-client'
import { Toast, toast as headlessToast } from 'react-hot-toast/headless'
import { isGDMChannelStreamId } from '@river-build/sdk'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Icon, IconButton, Stack, Text } from '@ui'
import { InviteUserList } from '@components/InviteUserList/InviteUserList'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { getNameListFromUsers } from '@components/UserList/UserList'
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
        headlessToast.custom((t) => (
            <InviteSuccessToast toast={t} channelId={channel} userIds={userIds} />
        ))
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
            <ChannelInvite />
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

const InviteSuccessToast = ({
    toast,
    channelId,
    userIds,
}: {
    userIds: string[]
    channelId: string
    toast: Toast
}) => {
    const channelDisplayName = useMemo(
        () => (isGDMChannelStreamId(channelId) ? 'this group' : 'this channel'),
        [channelId],
    )

    const users = useUserLookupArray(userIds)

    const message = useMemo(() => {
        const usersNameList = getNameListFromUsers(users)
        return `${usersNameList} has been added to ${channelDisplayName}`
    }, [channelDisplayName, users])

    return (
        <Box
            horizontal
            gap
            width={userIds.length >= 2 ? '400' : '300'}
            justifyContent="spaceBetween"
        >
            <Box horizontal gap>
                <Icon type="personAdd" />
                <Box>
                    <Text size="sm">{message}</Text>
                </Box>
            </Box>
            <IconButton icon="close" onClick={() => headlessToast.dismiss(toast.id)} />
        </Box>
    )
}
