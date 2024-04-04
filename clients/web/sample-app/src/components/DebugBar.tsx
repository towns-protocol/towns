import { Box, Typography } from '@mui/material'
import React from 'react'
import { useTownsContext } from 'use-towns-client'
import { useNetwork } from 'wagmi'

export const DebugBar = () => {
    const { chain } = useNetwork()
    const { environmentId } = useTownsContext()
    return (
        <Box paddingX="md" paddingTop={2} flexDirection="row">
            <Typography align="center" fontSize={10} paddingTop="20">
                River: <b>{environmentId}</b> Chain: <b>{chain?.name || 'Not connected'}</b>
            </Typography>
        </Box>
    )
}
