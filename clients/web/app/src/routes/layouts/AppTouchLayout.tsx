import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { TimelineShimmer } from '@components/Shimmer'

export const AppTouchLayout = () => {
    const { serverSpace: space } = useContractAndServerSpaceData()
    return (
        <Stack height="100%">
            {!space && <TimelineShimmer />}
            <SuspenseLoader>
                <Outlet />
            </SuspenseLoader>
        </Stack>
    )
}
