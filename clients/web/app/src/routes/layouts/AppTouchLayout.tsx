import React from 'react'
import { Outlet } from 'react-router'
import { Box } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'
import { TouchTabBarContext } from '@components/TouchTabBar/TouchTabBarContext'

export const AppTouchLayout = () => {
    const [tabBarHidden, setTabBarHidden] = React.useState(false)
    const value = { tabBarHidden, setTabBarHidden }

    return (
        <TouchTabBarContext.Provider value={value}>
            {/* stretch main container to push footer down */}
            <Box grow position="relative" overflowX="hidden">
                <SuspenseLoader>
                    <Outlet />
                </SuspenseLoader>
            </Box>
            {/* bottom content */}
            {!tabBarHidden && <TouchTabBar />}
        </TouchTabBarContext.Provider>
    )
}
