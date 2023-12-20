import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { DMChannelIdentifier, useZionClient, useZionContext } from 'use-zion-client'
import { useCreateLink } from 'hooks/useCreateLink'
import { Box, Button } from '@ui'
import { DirectMessageInviteUserList } from './DirectMessageInviteUserList'

type Props = {
    onDirectMessageCreated: () => void
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props
    const { createDMChannel, createGDMChannel } = useZionClient()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()

    const { dmChannels } = useZionContext()

    const [existingChannels, setExistingChannels] = useState<DMChannelIdentifier>()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())

    const checkIfChannelExists = useCallback(
        (userIds: Set<string>) =>
            dmChannels.find(
                (dm) =>
                    dm.userIds.length === userIds.size && dm.userIds.every((id) => userIds.has(id)),
            ),
        [dmChannels],
    )

    const onSelectionChange = useCallback(
        (selectedUserIds: Set<string>) => {
            const existingChannel = checkIfChannelExists(selectedUserIds)
            setExistingChannels(existingChannel)
            setSelectedUserIds(selectedUserIds)
        },
        [checkIfChannelExists],
    )

    const onSubmit = useCallback(
        async (selectedUserIds: Set<string>) => {
            const existingChannel = checkIfChannelExists(selectedUserIds)
            if (existingChannel) {
                const link = createLink({ messageId: existingChannel.id.streamId })
                if (link) {
                    onDirectMessageCreated()
                    navigate(link)
                }
                return
            }

            if (selectedUserIds.size === 1) {
                const first = Array.from(selectedUserIds)[0]
                const streamId = await createDMChannel(first)
                if (streamId) {
                    const link = createLink({ messageId: streamId.streamId })
                    if (link) {
                        onDirectMessageCreated()
                        navigate(link)
                    }
                }
            } else {
                const userIds = Array.from(selectedUserIds)

                const streamId = await createGDMChannel(userIds)
                if (streamId) {
                    const link = createLink({ messageId: streamId.streamId })
                    if (link) {
                        onDirectMessageCreated()
                        navigate(link)
                    }
                }
            }
        },
        [
            checkIfChannelExists,
            createDMChannel,
            createGDMChannel,
            createLink,
            navigate,
            onDirectMessageCreated,
        ],
    )

    const onCreateButtonClicked = () => {
        void onSubmit(selectedUserIds)
    }

    const cta = `${existingChannels ? 'Open' : 'Create'} ${
        selectedUserIds.size > 1 ? 'Group DM' : 'DM'
    }`

    return (
        <>
            <DirectMessageInviteUserList onSelectionChange={onSelectionChange} />
            <Box paddingX paddingBottom="md" bottom="none" left="none" right="none">
                <Button
                    disabled={selectedUserIds.size === 0}
                    tone="cta1"
                    onClick={onCreateButtonClicked}
                >
                    {cta}
                </Button>
            </Box>
        </>
    )
}
