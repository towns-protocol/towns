import React from 'react'
import { Box } from '@ui'
import { PotentiallyUnusedSuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'

export const TouchTabBarLayout = (props: { children: React.ReactNode }) => {
    return (
        <>
            {/* stretch main container to push footer down */}
            <Box grow position="relative" overflowX="hidden">
                <PotentiallyUnusedSuspenseLoader>{props.children}</PotentiallyUnusedSuspenseLoader>
            </Box>
            {/* bottom content */}
            <TouchTabBar />
        </>
    )
}
