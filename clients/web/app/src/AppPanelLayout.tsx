import { Allotment, AllotmentHandle } from 'allotment'
import React, { useEffect, useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import useEvent from 'react-use-event-hook'
import { SpaceContextProvider, useSpaceData, useZionContext } from 'use-zion-client'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { MainSideBar, MessagesSideBar, SpaceSideBar } from '@components/SideBars'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { Register } from 'routes/Register'
import { atoms } from 'ui/styles/atoms.css'

export const AppPanelLayout = () => {
    const spaceRoute = useMatch({ path: '/spaces/:spaceSlug', end: false })
    const needsOnboarding = useNeedsOnboarding()
    const spaceId = spaceRoute?.params.spaceSlug ?? ''

    return (
        <>
            {needsOnboarding ? (
                <Register />
            ) : (
                <SpaceContextProvider spaceId={spaceId}>
                    <AppPanelLayoutContent />
                </SpaceContextProvider>
            )}
        </>
    )
}

export const AppPanelLayoutContent = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: '/messages', end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
    const spacesNewRoute = useMatch({ path: '/spaces/new', end: true })
    const spacesSettingsRoute = useMatch({ path: '/spaces/:space/settings', end: false })

    const space = useSpaceData()
    const config = ['spaces', 'primary-menu', 'secondary-menu', 'content']
    const { onSizesChange, sizes } = usePersistPanes(config)

    const isSecondarySidebarActive = !!messageRoute

    useEffect(() => {
        allotemntRef.current?.reset()
    }, [isSecondarySidebarActive])

    const isSpacesExpanded = sizes[0] > 120

    const onExpandSpaces = useEvent(() => {
        const newSizes = [...sizes]

        newSizes[0] = isSpacesExpanded ? 65 : 320
        onSizesChange(newSizes)
        setTimeout(() => {
            allotemntRef.current?.reset()
        }, 0)
    })

    const displaySpacePanel = !spacesSettingsRoute && !spacesNewRoute && !!space && !homeRoute

    return (
        <Stack horizontal grow position="relative">
            <Box absoluteFill>
                <Allotment
                    // proportionalLayout
                    ref={allotemntRef}
                    className={atoms({ minHeight: '100%' })}
                    onChange={onSizesChange}
                >
                    {/* left-side side-bar goes here */}
                    <Allotment.Pane minSize={65} maxSize={320} preferredSize={sizes[0] || 65}>
                        <MainSideBar expanded={isSpacesExpanded} onExpandClick={onExpandSpaces} />
                    </Allotment.Pane>

                    {/* left-side side-bar goes here */}
                    <Allotment.Pane
                        minSize={180}
                        maxSize={320}
                        preferredSize={sizes[1] || 320}
                        visible={displaySpacePanel}
                    >
                        {space ? <SpaceSideBar space={space} /> : <></>}
                    </Allotment.Pane>

                    {/* secondary side bar */}
                    <Allotment.Pane
                        minSize={180}
                        maxSize={320}
                        visible={!!isSecondarySidebarActive}
                        preferredSize={sizes[2] || 320}
                    >
                        <MessagesSideBar />
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <Box absoluteFill scroll>
                            <SuspenseLoader>
                                <Outlet />
                            </SuspenseLoader>
                        </Box>
                    </Allotment.Pane>
                </Allotment>
            </Box>
        </Stack>
    )
}

function useNeedsOnboarding(): boolean {
    const { onboardingState } = useZionContext()
    switch (onboardingState.kind) {
        case 'user-profile':
            return onboardingState.bNeedsDisplayName
        default:
            return false
    }
}
