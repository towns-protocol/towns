import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { DMChannelIdentifier, useZionClient, useZionContext } from 'use-zion-client'
import { useCreateLink } from 'hooks/useCreateLink'
import { Box, Button } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { DirectMessageInviteUserList } from './DirectMessageInviteUserList'

type Props = {
    onDirectMessageCreated: () => void
}

export const CreateDirectMessage = (props: Props) => {
    const { onDirectMessageCreated } = props
    const { createDMChannel, createGDMChannel } = useZionClient()
    const { createLink } = useCreateLink()
    const navigate = useNavigate()
    const [isGroupDM, setIsGroupDM] = useState(false)

    const { dmChannels } = useZionContext()

    const [existingChannels, setExistingChannels] = useState<DMChannelIdentifier>()
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set<string>())

    const checkIfChannelExists = useCallback(
        (userIds: Set<string>) =>
            dmChannels.find(
                (dm) =>
                    !dm.isGroup &&
                    dm.userIds.length === userIds.size &&
                    dm.userIds.every((id) => userIds.has(id)),
            ),
        [dmChannels],
    )

    const [resetListKey, setResetListKey] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error creating the message',
    })

    const onSubmit = useCallback(
        async (selectedUserIds: Set<string>) => {
            console.log('create dm/gm: submit', Array.from(selectedUserIds).join())
            const existingChannel = checkIfChannelExists(selectedUserIds)
            if (existingChannel) {
                console.log('create dm/gm: existingChannel', existingChannel)
                const link = createLink({ messageId: existingChannel.id })
                if (link) {
                    onDirectMessageCreated()
                    navigate(link)
                }
                return
            }
            if (selectedUserIds.size === 0) {
                console.warn('create dm: submit - no users selected')
            } else if (selectedUserIds.size === 1) {
                const first = Array.from(selectedUserIds)[0]
                console.log('create dm: submit', first)
                const streamId = await createDMChannel(first)
                if (streamId) {
                    console.log('create dm: created stream', streamId)
                    const link = createLink({ messageId: streamId })
                    if (link) {
                        console.log('create dm: navigating', link)
                        onDirectMessageCreated()
                        navigate(link)
                    }
                } else {
                    console.error('create dm: failed creating stream')
                    setErrorMessage('failed to create dm stream')
                }

                setSelectedUserIds(new Set())
                setResetListKey((k) => k + 1)
            } else {
                const userIds = Array.from(selectedUserIds)
                console.log('create gm: submit', userIds.join())
                const streamId = await createGDMChannel(userIds)
                if (streamId) {
                    console.log('create gm: created stream', streamId)
                    const link = createLink({ messageId: streamId })
                    if (link) {
                        console.log('create gm: navigating', link)
                        onDirectMessageCreated()
                        navigate(link)
                    }
                } else {
                    setErrorMessage('failed to create gm stream')
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

    const onSelectionChange = useCallback(
        (selectedUserIds: Set<string>) => {
            const existingChannel = checkIfChannelExists(selectedUserIds)
            setExistingChannels(existingChannel)
            if (isGroupDM) {
                setSelectedUserIds(selectedUserIds)
                /*
                
                // TODO: This opens the existing GM interactively but we
                // currently don't have a nice way to show "new" messages

                if (existingChannel) {
                    const link = createLink({ messageId: existingChannel.id })
                    if (link) {
                        navigate(link)
                    }
                } else {
                    const link = createLink({ messageId: 'new' })
                    if (link) {
                        navigate(link)
                    }
                }*/
            } else if (selectedUserIds.size === 1) {
                onSubmit(selectedUserIds)
            }
        },
        [checkIfChannelExists, isGroupDM, onSubmit],
    )

    const onCreateButtonClicked = () => {
        void onSubmit(selectedUserIds)
    }

    const cta = `${existingChannels ? 'Open' : 'Create'} Group`

    const onToggleGroupDM = useCallback(() => {
        setIsGroupDM((g) => !g)
    }, [])

    return (
        <>
            <DirectMessageInviteUserList
                key={`list-${resetListKey}`}
                isMultiSelect={isGroupDM}
                onToggleMultiSelect={onToggleGroupDM}
                onSelectionChange={onSelectionChange}
            />

            {isGroupDM && (
                <Box paddingX paddingBottom="md" bottom="none" left="none" right="none">
                    <Button
                        disabled={selectedUserIds.size === 0}
                        tone="cta1"
                        onClick={onCreateButtonClicked}
                    >
                        {cta}
                    </Button>
                </Box>
            )}
        </>
    )
}
