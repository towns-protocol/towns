import React, { useCallback, useMemo, useState } from 'react'
import {
    CreateChannelInfo,
    Membership,
    RoomIdentifier,
    RoomVisibility,
    useZionClient,
} from 'use-zion-client'
import { Button, Dropdown, Stack, TextField } from '@ui'

interface Props {
    parentSpaceId: RoomIdentifier
    onClick: (roomId: RoomIdentifier, membership: Membership) => void
}

export const CreateChannelForm = (props: Props) => {
    const VisibilityOptions = [RoomVisibility.Private, RoomVisibility.Public]

    const [channelName, setChannelName] = useState<string>('')
    const [visibility, setVisibility] = useState<RoomVisibility>(RoomVisibility.Public)
    const { createChannel } = useZionClient()
    const { onClick, parentSpaceId } = props

    const disableCreateButton = useMemo(() => channelName.length === 0, [channelName.length])

    const onChannelNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setChannelName(event.target.value)
    }, [])

    const onClickCreatChannel = useCallback(async () => {
        if (disableCreateButton) {
            console.log('please enter a channel name')
            return
        }

        const createChannelInfo: CreateChannelInfo = {
            name: channelName,
            visibility,
            parentSpaceId: parentSpaceId,
            roleIds: [],
        }
        const roomId = await createChannel(createChannelInfo)

        if (roomId) {
            console.log('channel created with id', roomId)
            onClick(roomId, Membership.Join)
        }
    }, [disableCreateButton, channelName, visibility, parentSpaceId, createChannel, onClick])

    return (
        <Stack padding gap="lg" minWidth="400">
            <Stack gap="lg">
                <TextField
                    autoFocus
                    background="level2"
                    label="Channel Name"
                    secondaryLabel="(required)"
                    description="This is a channel within your space. This channel will have a unique url."
                    placeholder="Channel Name"
                    onChange={onChannelNameChange}
                />

                <Dropdown
                    background="level2"
                    label="Visibility"
                    message=""
                    options={VisibilityOptions.map((value) => ({
                        label: value,
                        value,
                    }))}
                    defaultValue={visibility}
                    onChange={(value) => setVisibility(value as RoomVisibility)}
                />
            </Stack>
            <Button size="button_lg" disabled={disableCreateButton} onClick={onClickCreatChannel}>
                Create
            </Button>
        </Stack>
    )
}
