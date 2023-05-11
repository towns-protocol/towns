import React from 'react'
import { AutojoinChannels, SpaceContextProvider, useZionContext } from 'use-zion-client'
import { useMatch } from 'react-router'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { AppStackLayout } from './AppStackLayout'
import { AppPanelLayout } from './AppPanelLayout'

export const AppLayout = () => {
    const spaceRoute = useMatch({ path: `/${PATHS.SPACES}/:spaceSlug`, end: false })
    const needsOnboarding = useNeedsOnboarding()
    const spaceId = spaceRoute?.params.spaceSlug ?? ''
    const { isMobile } = useDevice()

    return needsOnboarding ? (
        <Register />
    ) : (
        <SpaceContextProvider spaceId={spaceId}>
            <>
                <AutojoinChannels />
                {isMobile ? <AppStackLayout /> : <AppPanelLayout />}
            </>
        </SpaceContextProvider>
    )
}

function useNeedsOnboarding(): boolean {
    const { matrixOnboardingState } = useZionContext()
    switch (matrixOnboardingState.kind) {
        case 'update-profile':
            return matrixOnboardingState.bNeedsDisplayName
        default:
            return false
    }
}
