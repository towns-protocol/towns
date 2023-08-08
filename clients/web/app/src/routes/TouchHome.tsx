import React from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { Stack } from '@ui'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()

    return (
        <CentralPanelLayout>
            <Stack height="100%">
                <TouchLayoutHeader />
                {space && (
                    <SyncedChannelList
                        space={space}
                        mentions={mentions}
                        canCreateChannel={false}
                        onShowCreateChannel={() => {
                            // noop
                        }}
                    />
                )}
            </Stack>
        </CentralPanelLayout>
    )
}
