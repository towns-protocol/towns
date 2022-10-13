import React from 'react'
import { Outlet } from 'react-router'
import { Stack } from '@ui'

export const SpaceThreads = () => {
    return (
        <Stack grow horizontal>
            <Stack grow>{/*  */}</Stack>
            <Outlet />
        </Stack>
    )
}
