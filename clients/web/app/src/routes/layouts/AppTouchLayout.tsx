import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'

export const AppTouchLayout = () => {
    return (
        <Stack height="100%">
            <TouchLayoutHeader />
            <SuspenseLoader>
                <Outlet />
            </SuspenseLoader>
            <TouchTabBar />
        </Stack>
    )
}
