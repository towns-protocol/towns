import React from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { Box, Stack } from '@ui'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()

    return (
        <CentralPanelLayout>
            <Stack height="100%">
                <TouchLayoutHeader />
                <Box scroll grow>
                    <Box minHeight="forceScroll">
                        {space && (
                            <>
                                <SyncedChannelList
                                    space={space}
                                    mentions={mentions}
                                    canCreateChannel={false}
                                />
                            </>
                        )}
                    </Box>
                </Box>
            </Stack>
        </CentralPanelLayout>
    )
}
