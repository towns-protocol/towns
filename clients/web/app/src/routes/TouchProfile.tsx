import React from 'react'
import { Box, Stack } from '@ui'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Panel } from '@components/Panel/Panel'
import { SpaceProfile } from './SpacesProfilePanel'

export const TouchProfile = () => {
    return (
        <Panel isRootPanel label="You">
            <Stack scroll height="100%" id={TouchScrollToTopScrollId.ProfileTabScrollId}>
                <Box minHeight="forceScroll">
                    <SpaceProfile />
                </Box>
            </Stack>
        </Panel>
    )
}
