import React from 'react'
import { SpaceContextProvider } from 'use-towns-client'
import { useMatch } from 'react-router-dom'
import { AppDrawer } from '../components/AppDrawer'

export function AuthenticatedContent(): JSX.Element {
    const spaceRoute = useMatch({ path: '/spaces/:spaceSlug', end: false })
    return (
        <SpaceContextProvider spaceId={spaceRoute?.params.spaceSlug}>
            <AppDrawer />
        </SpaceContextProvider>
    )
}
