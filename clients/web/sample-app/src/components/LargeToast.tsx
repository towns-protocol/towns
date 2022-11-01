import React from 'react'
import { Box, Theme, Typography } from '@mui/material'

interface Props {
    message: string
}

export function LargeToast(props: Props): JSX.Element {
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
                {props.message}
            </Typography>
        </Box>
    )
}

const spacingStyle = {
    padding: (theme: Theme) => theme.spacing(2),
    gap: (theme: Theme) => theme.spacing(1),
}
