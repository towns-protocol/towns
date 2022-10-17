import { Allotment, AllotmentHandle } from 'allotment'
import React, { useEffect, useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import { SpaceContextProvider, useSpaceData, useZionContext } from 'use-zion-client'
import useEvent from 'react-use-event-hook'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { MainSideBar, MessagesSideBar, SpaceSideBar } from '@components/SideBars'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { atoms } from 'ui/styles/atoms.css'
import { Register } from 'routes/Register'

export const SidebarLayout = () => {
    const spaceRoute = useMatch({ path: '/spaces/:spaceSlug', end: false })
    const needsOnboarding = useNeedsOnboarding()
    return (
        <>
            {needsOnboarding ? (
                <Register />
            ) : (
                <SpaceContextProvider spaceId={spaceRoute?.params.spaceSlug}>
                    <SidebarLayoutContent />
                </SpaceContextProvider>
            )}
        </>
    )
}

export const SidebarLayoutContent = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: '/messages', end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
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
                    <Allotment.Pane minSize={180} maxSize={320} preferredSize={sizes[1] || 320}>
                        {space && !homeRoute ? <SpaceSideBar space={space} /> : <></>}
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
