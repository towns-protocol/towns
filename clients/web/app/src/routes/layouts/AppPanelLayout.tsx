import { Allotment, AllotmentHandle } from 'allotment'
import React, { useEffect, useRef, useState } from 'react'
import { Outlet, useMatch, useParams } from 'react-router'
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
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'
import { useMobile } from 'hooks/useMobile'
import { isTownBanned } from 'utils'
import { usePanels } from './hooks/usePanels'

const config = ['spaces', 'primary-menu', 'secondary-menu', 'content']

export const AppPanelLayout = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: `/${PATHS.MESSAGES}`, end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
    const spacesNewRoute = useMatch({ path: `/${PATHS.SPACES}/new`, end: true })
    const { spaceSlug } = useParams<{ spaceSlug: string }>()

    const space = useSpaceData()

    const { onSizesChange, sizes } = usePersistPanes(config)

    const isMessagesRoute = !!messageRoute

    const isTownBannedStatus = spaceSlug ? isTownBanned(spaceSlug) : false

    // we still want to show town drawer event when space is loading, so we
    // can't rely on `space` being defined
    const hasTownRoute = !!useSpaceIdFromPathname() || space !== undefined

    const displaySpacePanel =
        !isTownBannedStatus && hasTownRoute && (!(spacesNewRoute || homeRoute) || isMessagesRoute)

    return (
        <>
            <Stack absoluteFill padding="xs">
                <AppStoreBanner insetX="xxs" insetTop="xxs" />
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
                            <SpaceSideBar space={space} />
                        ) : (
                            <SpaceSidebarLoadingPlaceholder />
                        )}
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <CentralPanelLayout />
                    </Allotment.Pane>
                </Allotment>
            </Stack>
            <ShortcutModal />
        </>
    )
}

const CentralPanelLayout = () => {
    const isMobile = useMobile()

    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])

    const panel = usePanels()

    const [ready, setReady] = useState(false)
    useEffect(() => {
        setReady(true)
    }, [])

    return (
        <Allotment onChange={onSizesChange}>
            <Allotment.Pane minSize={500}>
                <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                    <Card absoluteFillSafeSafari>{ready && <Outlet />}</Card>
                </ErrorBoundary>
            </Allotment.Pane>
            {panel && (
                <Allotment.Pane minSize={isMobile ? 300 : 400} preferredSize={sizes[1] || 450}>
                    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
                        {/* named outled would have been ideal here */}
                        {panel}
                    </ErrorBoundary>
                </Allotment.Pane>
            )}
        </Allotment>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}
