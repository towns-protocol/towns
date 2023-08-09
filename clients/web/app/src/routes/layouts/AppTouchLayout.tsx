import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'
import { TouchTabBarContext } from '@components/TouchTabBar/TouchTabBarContext'

export const AppTouchLayout = () => {
    const [tabBarHidden, setTabBarHidden] = React.useState(false)
    const value = { tabBarHidden, setTabBarHidden }

    return (
        <Stack height="100%">
            <TouchTabBarContext.Provider value={value}>
                <SuspenseLoader>
                    <Outlet />
                </SuspenseLoader>

                {!tabBarHidden && <TouchTabBar />}
            </TouchTabBarContext.Provider>
        </Stack>
    )
}
