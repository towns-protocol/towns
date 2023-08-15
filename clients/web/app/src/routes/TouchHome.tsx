import React from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { Box, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()
    const spaceData = useSpaceData()
    const isLoadingChannels = spaceData?.isLoadingChannels ?? true

    return (
        <CentralPanelLayout>
            <Stack height="100%">
                <TouchLayoutHeader />
                <Box scroll grow>
                    <Box minHeight="forceScroll">
                        {space && !isLoadingChannels ? (
                            <SyncedChannelList
                                space={space}
                                mentions={mentions}
                                canCreateChannel={false}
                            />
                        ) : (
                            <Box absoluteFill centerContent>
                                <ButtonSpinner />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Stack>
        </CentralPanelLayout>
    )
}
