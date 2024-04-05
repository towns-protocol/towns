import React, { useEffect } from 'react'
import { useIsSpaceOwner, useSpaceData } from 'use-towns-client'
import { useNavigate } from 'react-router'
import { Stack } from '@ui'
import { SpaceOwnerLanding } from '@components/SpaceOwnerLanding'
import { PATHS } from 'routes'
import { useAuth } from 'hooks/useAuth'

export const SpaceGettingStarted = () => {
    const space = useSpaceData()
    const { loggedInWalletAddress } = useAuth()
    const { isOwner, isLoading } = useIsSpaceOwner(space?.id, loggedInWalletAddress)
    const navigate = useNavigate()

    //  temporary auth hack
    useEffect(() => {
        if (isLoading) {
            return
        }
        if (space?.id && !isOwner) {
            navigate(`/${PATHS.SPACES}/${space?.id}/${PATHS.THREADS}`)
        }
    }, [isOwner, isLoading, navigate, space?.id])

    return (
        <Stack position="relative">
            <SpaceOwnerLanding />
        </Stack>
    )
}
