import React from 'react'
import { Outlet } from 'react-router'
import { Box } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'
import { VisualKeyboardContextProvider } from '@components/VisualKeyboardContext/VisualKeyboardContext'

export const AppTouchLayout = () => {
    return (
        <VisualKeyboardContextProvider>
            {/* stretch main container to push footer down */}
            <Box grow position="relative" overflowX="hidden">
                <SuspenseLoader>
                    <Outlet />
                </SuspenseLoader>
            </Box>
            {/* bottom content */}
            <TouchTabBar />
        </VisualKeyboardContextProvider>
    )
}
