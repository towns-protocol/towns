import React from 'react'
import { Box, Stack } from '@ui'
import { TouchNavBar } from '@components/TouchNavBar/TouchNavBar'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { SpaceProfile } from './SpacesProfilePanel'

export const TouchProfile = () => {
    return (
        <Stack absoluteFill background="level1">
            <TouchNavBar>You</TouchNavBar>
            <Box grow position="relative">
                <Box absoluteFill position="relative">
                    <Stack scroll height="100%" id={TouchScrollToTopScrollId.ProfileTabScrollId}>
                        <Box minHeight="forceScroll">
                            <SpaceProfile />
                        </Box>
                    </Stack>
                </Box>
            </Box>
        </Stack>
    )
}
