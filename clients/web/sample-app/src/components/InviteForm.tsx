import { Box, Button, TextField, Theme, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'
import { RoomIdentifier } from 'use-zion-client'

interface Props {
    roomId: RoomIdentifier
    roomName: string
    isSpace?: boolean
    sendInvite: (roomId: RoomIdentifier, invitee: string) => Promise<void>
    onClickCancel: () => void
}

export function InviteForm(props: Props): JSX.Element {
    const [inviteeUserId, setInviteeUserId] = useState<string>('')

    const header = props.isSpace
        ? `Invite to join space "${props.roomName}"`
        : `Invite to join room "${props.roomName}"`

    const disableInviteButton = useMemo(() => inviteeUserId.length === 0, [inviteeUserId.length])

    const onChangeUserId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setInviteeUserId(event.target.value)
    }, [])

    const onClickInvite = useCallback(async () => {
        props.sendInvite(props.roomId, inviteeUserId)
    }, [inviteeUserId, props])

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{
                p: (theme: Theme) => theme.spacing(8),
            }}
        >
            <Typography variant="h6" noWrap component="div" sx={spacingStyle}>
                {header}
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(3, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography variant="body1" noWrap component="div" sx={spacingStyle}>
                        Invitee user ID:
                    </Typography>
                    <TextField
                        id="filled-basic"
                        label="@userId:homeServer"
                        variant="filled"
                        fullWidth={true}
                        onChange={onChangeUserId}
                    />
                </Box>
                <Box />
                <Box display="grid" alignItems="center" gridTemplateColumns="repeat(2, 1fr)">
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={onClickInvite}
                            disabled={disableInviteButton}
                        >
                            Invite
                        </Button>
                    </Box>
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Button variant="contained" color="primary" onClick={props.onClickCancel}>
                            Cancel
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
