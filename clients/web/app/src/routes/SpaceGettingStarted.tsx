import React, { useEffect } from 'react'
import { Permission, useHasPermission, useSpaceData } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { Stack } from '@ui'
import { SpaceOwnerLanding } from '@components/SpaceOwnerLanding'
import { PATHS } from 'routes'
import { useAuth } from 'hooks/useAuth'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceGettingStarted = () => {
    const space = useSpaceData()
    const { loggedInWalletAddress } = useAuth()
    const { hasPermission: owner, isLoading } = useHasPermission({
        spaceId: space?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.Owner,
    })
    const navigate = useNavigate()

    //  temporary auth hack
    useEffect(() => {
        if (isLoading) {
            return
        }
        if (!owner) {
            navigate(`/${PATHS.SPACES}/${space?.id}/${PATHS.THREADS}`)
        }
    }, [owner, isLoading, navigate, space?.id])

    return (
        <CentralPanelLayout>
            <Stack>
                <Stack position="relative">
                    <SpaceOwnerLanding />
                </Stack>
            </Stack>
        </CentralPanelLayout>
    )
}
