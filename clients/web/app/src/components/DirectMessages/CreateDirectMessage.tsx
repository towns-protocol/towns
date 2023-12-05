import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useZionClient } from 'use-zion-client'
import { useCreateLink } from 'hooks/useCreateLink'
import { DirectMessageInviteUserList } from './DirectMessageInviteUserList'

type Props = {
    onDirectMessageCreated: () => void
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props
    const { createDMChannel, createGDMChannel } = useZionClient()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()

    const onCreateButtonClicked = useCallback(
        async (selectedUserIds: Set<string>) => {
            if (selectedUserIds.size === 1) {
                const first = Array.from(selectedUserIds)[0]
                const streamId = await createDMChannel(first)

                if (streamId) {
                    const link = createLink({ messageId: streamId.slug })
                    if (link) {
                        navigate(link)
                        onDirectMessageCreated()
                    }
                }
            } else {
                const userIds = Array.from(selectedUserIds)
                const streamId = await createGDMChannel(userIds)
                if (streamId) {
                    const link = createLink({ messageId: streamId.slug })
                    if (link) {
                        navigate(link)
                        onDirectMessageCreated()
                    }
                }
            }
        },
        [createDMChannel, createLink, navigate, onDirectMessageCreated, createGDMChannel],
    )
    return (
        <DirectMessageInviteUserList
            submitButtonTextSingleUser="Create DM"
            submitButtonTextMultipleUsers="Create Group DM"
            onSubmit={onCreateButtonClicked}
        />
    )
}
