import React from 'react'
import { useSpaceData } from 'use-zion-client'
import { Stack } from '@ui'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'

export const StackLayoutDropdown = () => {
    const space = useSpaceData()
    return (
        <Stack scroll paddingTop="lg">
            {space && (
                <SyncedChannelList
                    canCreateChannel={false}
                    space={space}
                    mentions={[]}
                    onShowCreateChannel={() => {
                        /* noop */
                    }}
                />
            )}
        </Stack>
    )
}
