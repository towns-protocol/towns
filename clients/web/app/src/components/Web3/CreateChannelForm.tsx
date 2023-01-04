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
    const [encrypted, setEncrypted] = useState<'yes' | 'no'>('no')
    const { createChannelRoom } = useZionClient()
    const { onClick, parentSpaceId } = props

    const disableCreateButton = useMemo(() => channelName.length === 0, [channelName.length])

    const onChannelNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setChannelName(event.target.value.toLowerCase().replaceAll(' ', '-'))
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
            disableEncryption: encrypted === 'no',
        }
        const roomId = await createChannelRoom(createChannelInfo)

        if (roomId) {
            console.log('channel created with id', roomId)
            onClick(roomId, Membership.Join)
        }
    }, [
        disableCreateButton,
        channelName,
        visibility,
        parentSpaceId,
        encrypted,
        createChannelRoom,
        onClick,
    ])

    const onKeyDown = useCallback(async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!new RegExp(/^[a-zA-Z0-9 _-]+$/).test(event.key)) {
            event.preventDefault()
            return
        }

        const val = event.currentTarget.value
        const prevChar = val.charAt(val.length - 1)
        if (
            (event.key === ' ' || event.key === ' Spacebar' || event.key === '-') &&
            prevChar === '-'
        ) {
            event.preventDefault()
        }
    }, [])

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
                    value={channelName}
                    maxLength={30}
                    onKeyDown={onKeyDown}
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
                <Dropdown
                    background="level2"
                    label="Encrypted"
                    message=""
                    options={['yes', 'no'].map((value) => ({
                        label: value,
                        value,
                    }))}
                    defaultValue={encrypted}
                    onChange={(value) => setEncrypted(value as 'yes' | 'no')}
                />
            </Stack>
            <Button size="button_lg" disabled={disableCreateButton} onClick={onClickCreatChannel}>
                Create
            </Button>
        </Stack>
    )
}
