import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'

export const AppTouchLayout = () => {
    return (
        <Stack height="100%">
            <SuspenseLoader>
                <Outlet />
            </SuspenseLoader>
            <TouchTabBar />
        </Stack>
    )
}
