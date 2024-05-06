import { Box, Button, TextField, Theme, Typography } from '@mui/material'
import React, { useCallback, useMemo, useState } from 'react'

interface Props {
    streamId: string
    streamName: string
    isSpace?: boolean
    sendInvite: (streamId: string, invitee: string) => Promise<void>
    onClickCancel: () => void
}

export function InviteForm(props: Props): JSX.Element {
    const [inviteeUserId, setInviteeUserId] = useState<string>('')

    const header = props.isSpace
        ? `Invite to join space "${props.streamName}"`
        : `Invite to join channel "${props.streamName}"`

    const disableInviteButton = useMemo(() => inviteeUserId.length === 0, [inviteeUserId.length])

    const onChangeUserId = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setInviteeUserId(event.target.value)
    }, [])

    const onClickInvite = useCallback(async () => {
        props.sendInvite(props.streamId, inviteeUserId)
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
            <Typography noWrap variant="h6" component="div" sx={spacingStyle}>
                {header}
            </Typography>
            <Box display="grid" gridTemplateRows="repeat(3, 1fr)">
                <Box
                    display="grid"
                    alignItems="center"
                    gridTemplateColumns="repeat(2, 1fr)"
                    marginTop="10px"
                >
                    <Typography noWrap variant="body1" component="div" sx={spacingStyle}>
                        Invitee user ID:
                    </Typography>
                    <TextField
                        fullWidth
                        id="filled-basic"
                        label="0x..."
                        variant="filled"
                        onChange={onChangeUserId}
                    />
                </Box>
                <Box />
                <Box display="grid" alignItems="center" gridTemplateColumns="repeat(2, 1fr)">
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={disableInviteButton}
                            onClick={onClickInvite}
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
