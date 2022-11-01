import React from 'react'
import { SpaceContextProvider, useZionContext } from 'use-zion-client'
import { useMatch } from 'react-router-dom'
import { AppDrawer } from '../components/AppDrawer'
import { UserDisplayNameForm } from '../components/UserDisplayNameForm'
import { LargeToast } from '../components/LargeToast'

export function AuthenticatedContent(): JSX.Element {
    const spaceRoute = useMatch({ path: '/spaces/:spaceSlug', end: false })
    const { onboardingState } = useZionContext()

    switch (onboardingState.kind) {
        case 'error':
            console.error('onboarding error', onboardingState)
            return <div>We experienced an error during onboarding... please reload the page</div>
        case 'loading':
            return <LargeToast message={onboardingState.message} />
        case 'none':
            return <></>
        case 'toast':
            return <LargeToast message={onboardingState.message} />
        case 'user-profile':
            if (onboardingState.bNeedsDisplayName) {
                return <UserDisplayNameForm />
            } else {
                console.error('Unknown onboarding step', onboardingState)
                return <div>Oops, we don&apos;t have UI for this step in the sample app</div>
            }
        case 'done':
            return (
                <SpaceContextProvider spaceId={spaceRoute?.params.spaceSlug}>
                    <AppDrawer />
                </SpaceContextProvider>
            )
    }
}
