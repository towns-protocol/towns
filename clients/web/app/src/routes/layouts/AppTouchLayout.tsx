import React from 'react'
import { Outlet } from 'react-router'
import { Box, Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'
import { TouchTabBarContext } from '@components/TouchTabBar/TouchTabBarContext'

export const AppTouchLayout = () => {
    const [tabBarHidden, setTabBarHidden] = React.useState(false)
    const value = { tabBarHidden, setTabBarHidden }

    return (
        <Stack height="100%">
            <TouchTabBarContext.Provider value={value}>
                {/* stretch main container to push footer down */}
                <Box grow>
                    <SuspenseLoader>
                        <Outlet />
                    </SuspenseLoader>
                </Box>
                {/* bottom content */}
                {!tabBarHidden && <TouchTabBar />}
            </TouchTabBarContext.Provider>
        </Stack>
    )
}
