import React, { useEffect } from 'react'
import { useSpaceData } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { Stack } from '@ui'
import { BackgroundGrid } from '@components/BackgroundGrid'
import { SpaceOwnerLanding } from '@components/SpaceOwnerLanding'
import { PATHS } from 'routes'
import { useIsSpaceOwner } from 'hooks/useIsSpaceOwner'

export const SpaceGettingStarted = () => {
    const space = useSpaceData()
    const owner = useIsSpaceOwner()
    const navigate = useNavigate()

    //  temporary auth hack
    useEffect(() => {
        if (owner === null) {
            return
        }
        if (!owner) {
            navigate(`/${PATHS.SPACES}/${space?.id?.slug}/${PATHS.THREADS}`)
        }
    }, [owner, navigate, space?.id?.slug])

    return (
        <Stack>
            <BackgroundGrid />
            <Stack position="relative">
                <SpaceOwnerLanding />
            </Stack>
        </Stack>
    )
}
