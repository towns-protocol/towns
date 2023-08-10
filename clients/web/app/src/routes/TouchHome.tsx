import React, { useContext, useEffect } from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { Box, Stack } from '@ui'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { TouchTabBarContext } from '@components/TouchTabBar/TouchTabBarContext'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()

    const { setTabBarHidden } = useContext(TouchTabBarContext)
    // Handle the case where the user swipes back from a channel while the keyboard is open.
    useEffect(() => {
        setTabBarHidden(false)
    }, [setTabBarHidden])

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
