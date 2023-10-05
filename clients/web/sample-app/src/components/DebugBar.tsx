import { Box, Typography } from '@mui/material'
import React from 'react'
import { useZionContext } from 'use-zion-client'
import { useNetwork } from 'wagmi'

export const DebugBar = () => {
    const { chain } = useNetwork()
    const { casablancaServerUrl } = useZionContext()
    return (
        <Box paddingX="md" paddingTop={2} flexDirection="row">
            <Typography align="center" fontSize={10} paddingTop="20">
                River: <b>{casablancaServerUrl}</b> Chain: <b>{chain?.name || 'Not connected'}</b>
            </Typography>
        </Box>
    )
}
