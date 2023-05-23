import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'

export const AppTouchLayout = () => {
    return (
        <Stack height="100dvh">
            <SuspenseLoader>
                <Outlet />
            </SuspenseLoader>
        </Stack>
    )
}
