import React, { useCallback, useState } from 'react'
import { Box, Button, Heading, Stack, TextField } from '@ui'

interface Props {
    spaceName: string
    spaceId: string
    roomName?: string
    roomId?: string
    onInviteClicked: (spaceId: string, roomId: string | undefined, inviteeUserId: string) => void
    onCancelClicked: () => void
}

export const InviteUserToRoomForm = (props: Props) => {
    const [inviteeUserId, setInviteeUserId] = useState<string>('')

    const onChangeUserId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setInviteeUserId(event.target.value)
    }, [])
    const onInviteClicked = useCallback(() => {
        console.log('invite clicked', inviteeUserId)
        if (inviteeUserId === '') {
            console.log('error, invitee is empty')
            return
        }
        props.onInviteClicked(props.spaceId, props.roomId, inviteeUserId)
    }, [inviteeUserId, props])

    return (
        <Stack padding gap="lg" minWidth="400">
            <Box paddingY="lg">
                <Heading level={2} textAlign="center">
                    Invite User to join <br />
                    {props.roomName ?? props.spaceName}
                </Heading>
            </Box>
            <Stack gap="lg">
                <TextField
                    background="level2"
                    label="Invitee user id"
                    placeholder="@userId:homeServer"
                    onChange={onChangeUserId}
                />
                <Button size="button_lg" onClick={onInviteClicked}>
                    Invite
                </Button>
                <Button size="button_lg" tone="neutral" onClick={props.onCancelClicked}>
                    Cancel
                </Button>
            </Stack>
        </Stack>
    )
}
