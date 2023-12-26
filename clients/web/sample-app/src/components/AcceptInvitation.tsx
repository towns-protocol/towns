import { Box, Button, Theme, Typography } from '@mui/material'

import React, { useCallback } from 'react'

interface Props {
    roomId: string
    joinRoom: (roomId: string) => Promise<void>
}

export function AcceptInvitation(props: Props): JSX.Element {
    const onClick = useCallback(async () => {
        await props.joinRoom(props.roomId)
    }, [props])

    return (
        <Box display="flex" flexDirection="column">
            <Typography display="block" variant="body1" component="span" sx={messageStyle}>
                You have to join the room to see the messages.
            </Typography>
            <Box display="flex" flexDirection="column" alignItems="center" marginTop="10px">
                <Button variant="contained" color="primary" onClick={onClick}>
                    Join
                </Button>
            </Box>
        </Box>
    )
}

const messageStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}
