import React from 'react'
import { Outlet } from 'react-router'
import { useSpaceData } from 'use-zion-client'
import { Heading, Stack } from '@ui'

export const SpaceGettingStarted = () => {
    const space = useSpaceData()

    return (
        <Stack>
            <Stack grow horizontal padding="lg">
                <Heading level={1}>Welcome to {space?.name}</Heading>
            </Stack>
            <Stack grow gap>
                <Stack />
            </Stack>
            <Outlet />
        </Stack>
    )
}
