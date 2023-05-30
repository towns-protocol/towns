import React from 'react'
import { AutojoinChannels, SpaceContextProvider, useZionContext } from 'use-zion-client'
import { useMatch } from 'react-router'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { AppTouchLayout } from './AppTouchLayout'
import { AppPanelLayout } from './AppPanelLayout'

export const AppLayout = () => {
    const spaceRoute = useMatch({ path: `/${PATHS.SPACES}/:spaceSlug`, end: false })
    const needsOnboarding = useNeedsOnboarding() || false
    const spaceId = spaceRoute?.params.spaceSlug ?? ''
    const { isTouch } = useDevice()

    return needsOnboarding ? (
        <Register />
    ) : (
        <SpaceContextProvider spaceId={spaceId}>
            <>
                <AutojoinChannels />
                {isTouch ? <AppTouchLayout /> : <AppPanelLayout />}
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
