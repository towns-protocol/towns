import React, { useEffect } from 'react'
import { Permission, useSpaceData } from 'use-zion-client'
import { useNavigate } from 'react-router'
import { Stack } from '@ui'
import { BackgroundGrid } from '@components/BackgroundGrid'
import { SpaceOwnerLanding } from '@components/SpaceOwnerLanding'
import { PATHS } from 'routes'
import { useHasPermission } from 'hooks/useHasPermission'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

export const SpaceGettingStarted = () => {
    const space = useSpaceData()
    const { data: owner, isLoading } = useHasPermission(Permission.Owner)
    const navigate = useNavigate()

    //  temporary auth hack
    useEffect(() => {
        if (isLoading) {
            return
        }
        if (!owner) {
            navigate(`/${PATHS.SPACES}/${space?.id?.slug}/${PATHS.THREADS}`)
        }
    }, [owner, isLoading, navigate, space?.id?.slug])

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
