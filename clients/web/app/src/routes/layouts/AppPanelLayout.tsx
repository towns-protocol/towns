import { Allotment, AllotmentHandle } from 'allotment'
import React, { useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import { useSpaceData } from 'use-towns-client'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { ShortcutModal } from '@components/Shortcuts/ShortcutModal'
import { MainSideBar, SpaceSideBar } from '@components/SideBars'
import { SpaceSidebarLoadingPlaceholder } from '@components/SideBars/SpaceSideBar/SpaceSideBarLoading'
import { Box, Card, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { TopBar } from '@components/TopBar/TopBar'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { PATHS } from 'routes'
import { usePanels } from './hooks/usePanels'

export const AppPanelLayout = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: `/${PATHS.MESSAGES}`, end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
    const spacesNewRoute = useMatch({ path: `/${PATHS.SPACES}/new`, end: true })
    const spacesSettingsRoute = useMatch({ path: `/${PATHS.SPACES}/:space/settings`, end: false })

    const space = useSpaceData()
    const config = ['spaces', 'primary-menu', 'secondary-menu', 'content']
    const { onSizesChange, sizes } = usePersistPanes(config)

    const isMessagesRoute = !!messageRoute

    // we still want to show town drawer event when space is loading, so we
    // can't rely on `space` being defined
    const hasTownRoute = !!useSpaceIdFromPathname() || space

    const displaySpacePanel =
        hasTownRoute && (!(spacesSettingsRoute || spacesNewRoute || homeRoute) || isMessagesRoute)

    return (
        <>
            <Stack absoluteFill padding="xs">
                <TopBar />
                <Allotment
                    // proportionalLayout
                    ref={allotemntRef}
                    onChange={onSizesChange}
                >
                    {/* left-side side-bar goes here */}
                    <Allotment.Pane
                        minSize={64 + 8}
                        maxSize={64 + 8}
                        preferredSize={sizes[0] || 65}
                    >
                        <MainSideBar />
                    </Allotment.Pane>

                    {/* channel side-bar goes here */}
                    <Allotment.Pane
                        minSize={250}
                        maxSize={400}
                        preferredSize={sizes[1] || 320}
                        visible={displaySpacePanel || isMessagesRoute}
                    >
                        {isMessagesRoute ? (
                            <DirectMessagesPanel />
                        ) : space ? (
                            <SpaceSideBar space={space} key={space.id} />
                        ) : (
                            <SpaceSidebarLoadingPlaceholder />
                        )}
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <Box absoluteFill scroll>
                            <CentralPanelLayout />
                        </Box>
                    </Allotment.Pane>
                </Allotment>
            </Stack>
            <ShortcutModal />
        </>
    )
}

const CentralPanelLayout = () => {
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])

    const panel = usePanels()

    return (
        <Stack minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>
                    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                        <Box position="absoluteFillSafeSafari">
                            <Card width="100%" height="100%">
                                <Outlet />
                            </Card>
                        </Box>
                    </ErrorBoundary>
                </Allotment.Pane>
                {panel && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 450}>
                        <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                            {/* named outled would have been ideal here */}
                            {panel}
                        </ErrorBoundary>
                    </Allotment.Pane>
                )}
            </Allotment>
        </Stack>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}
