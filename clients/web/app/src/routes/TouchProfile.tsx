import React from 'react'
import { Box, Stack } from '@ui'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { SpaceProfile } from './SpacesProfilePanel'

export const TouchProfile = () => {
    return (
        <Stack height="100%">
            <TouchNavBar>You</TouchNavBar>
            <Box grow position="relative">
                <Box absoluteFill position="relative">
                    <Stack scroll height="100%">
                        <Box minHeight="forceScroll">
                            <SpaceProfile />
                        </Box>
                    </Stack>
                </Box>
            </Box>
        </Stack>
    )
}
