import React from 'react'
import { Stack } from '@ui'
import { BackgroundGrid } from '@components/BackgroundGrid'
import { SpaceOwnerLanding } from '@components/SpaceOwnerLanding'

export const SpaceGettingStarted = () => {
    return (
        <Stack>
            <BackgroundGrid />
            <Stack position="relative">
                <SpaceOwnerLanding />
            </Stack>
        </Stack>
    )
}
