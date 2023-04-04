import { Allotment, AllotmentHandle } from 'allotment'
import React, { useEffect, useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { AutojoinChannels, SpaceContextProvider, useZionContext } from 'use-zion-client'

import { PATHS } from 'routes'
import { SuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { MainSideBar, SpaceSideBar } from '@components/SideBars'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { Register } from 'routes/Register'
import { atoms } from 'ui/styles/atoms.css'
import { ChannelsShimmer } from '@components/Shimmer'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import * as styles from './AppPanelLayout.css'

export const AppPanelLayout = () => {
    const spaceRoute = useMatch({ path: `/${PATHS.SPACES}/:spaceSlug`, end: false })
    const needsOnboarding = useNeedsOnboarding()
    const spaceId = spaceRoute?.params.spaceSlug ?? ''

    return (
        <>
            {needsOnboarding ? (
                <Register />
            ) : (
                <SpaceContextProvider spaceId={spaceId}>
                    <>
                        <AutojoinChannels />
                        <AppPanelLayoutContent />
                    </>
                </SpaceContextProvider>
            )}
        </>
    )
}

export const AppPanelLayoutContent = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: '/messages', end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
    const spacesNewRoute = useMatch({ path: `/${PATHS.SPACES}/new`, end: true })
    const spacesSettingsRoute = useMatch({ path: `/${PATHS.SPACES}/:space/settings`, end: false })

    const { serverSpace: space, chainSpace } = useContractAndServerSpaceData()
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

    const displaySpacePanel =
        !spacesSettingsRoute && !spacesNewRoute && !!(chainSpace || space) && !homeRoute

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
                    <Allotment.Pane minSize={65} maxSize={65} preferredSize={sizes[0] || 65}>
                        <MainSideBar expanded={isSpacesExpanded} onExpandClick={onExpandSpaces} />
                    </Allotment.Pane>

                    {/* channel side-bar goes here */}
                    <Allotment.Pane
                        minSize={180}
                        maxSize={320}
                        preferredSize={sizes[1] || 320}
                        visible={displaySpacePanel}
                    >
                        {space ? (
                            <SpaceSideBar
                                space={space}
                                className={styles.allotmentResizeBorderPadding}
                            />
                        ) : (
                            <>
                                <Stack
                                    padding
                                    centerContent
                                    position="relative"
                                    width="100%"
                                    aspectRatio="4/3"
                                >
                                    <Box
                                        rounded="full"
                                        background="level2"
                                        width="100"
                                        height="100"
                                    />
                                </Stack>
                                <ChannelsShimmer />
                            </>
                        )}
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <Box absoluteFill scroll className={styles.allotmentResizeBorderPadding}>
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
    const { matrixOnboardingState } = useZionContext()
    switch (matrixOnboardingState.kind) {
        case 'update-profile':
            return matrixOnboardingState.bNeedsDisplayName
        default:
            return false
    }
}
