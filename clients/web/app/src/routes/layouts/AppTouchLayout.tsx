import React from 'react'
import { Outlet, useMatch } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { TimelineShimmer } from '@components/Shimmer'
import { PATHS } from 'routes'

export const AppTouchLayout = () => {
    const { serverSpace: space } = useContractAndServerSpaceData()
    const messageRoute = useMatch({ path: `/${PATHS.MESSAGES}`, end: false })
    const isMessagesRoute = !!messageRoute
    return (
        <Stack height="100%">
            {!isMessagesRoute && !space && <TimelineShimmer />}
            <SuspenseLoader>
                <Outlet />
            </SuspenseLoader>
        </Stack>
    )
}
