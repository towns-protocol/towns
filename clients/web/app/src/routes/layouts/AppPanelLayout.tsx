import { Allotment, AllotmentHandle } from 'allotment'
import React, { useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import { useSpaceData } from 'use-towns-client'
import { DirectMessagesPanel } from '@components/DirectMessages/DirectMessages'
import { PotentiallyUnusedSuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { ShortcutModal } from '@components/Shortcuts/ShortcutModal'
import { MainSideBar, SpaceSideBar } from '@components/SideBars'
import { SpaceSidebarLoadingPlaceholder } from '@components/SideBars/SpaceSideBar/SpaceSideBarLoading'
import { Box, Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PATHS } from 'routes'
import { TopBar, TopBarSkeleton } from '@components/TopBar/TopBar'
import { atoms } from 'ui/styles/atoms.css'
import * as styles from './AppPanelLayout.css'

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
        <Stack horizontal grow borderTop position="relative">
            <Box absoluteFill>
                <TopBar />
                <Allotment
                    // proportionalLayout
                    ref={allotemntRef}
                    className={atoms({ borderTop: 'default' })}
                    onChange={onSizesChange}
                >
                    {/* left-side side-bar goes here */}
                    <Allotment.Pane minSize={65} maxSize={65} preferredSize={sizes[0] || 65}>
                        <MainSideBar />
                    </Allotment.Pane>

                    {/* channel side-bar goes here */}
                    <Allotment.Pane
                        minSize={180}
                        maxSize={320}
                        preferredSize={sizes[1] || 320}
                        visible={displaySpacePanel || isMessagesRoute}
                    >
                        {isMessagesRoute ? (
                            <DirectMessagesPanel />
                        ) : space ? (
                            <SpaceSideBar
                                space={space}
                                className={styles.allotmentResizeBorderPadding}
                                key={space.id}
                            />
                        ) : (
                            <SpaceSidebarLoadingPlaceholder />
                        )}
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <Box absoluteFill scroll className={styles.allotmentResizeBorderPadding}>
                            <PotentiallyUnusedSuspenseLoader>
                                <Outlet />
                            </PotentiallyUnusedSuspenseLoader>
                        </Box>
                    </Allotment.Pane>
                </Allotment>
            </Box>
            <ShortcutModal />
        </Stack>
    )
}

export const AppPanelLayoutSkeleton = () => {
    return (
        <Stack horizontal grow borderTop position="relative">
            <Box absoluteFill>
                <TopBarSkeleton />
                <Allotment className={atoms({ borderTop: 'default' })}>
                    {/* left-side side-bar goes here */}
                    <Allotment.Pane minSize={65} maxSize={65} preferredSize={65}>
                        <></>
                    </Allotment.Pane>

                    {/* channel side-bar goes here */}
                    <Allotment.Pane visible minSize={180} maxSize={320} preferredSize={320}>
                        <SpaceSidebarLoadingPlaceholder />
                    </Allotment.Pane>

                    {/* main container */}
                    <Allotment.Pane>
                        <Box absoluteFill scroll className={styles.allotmentResizeBorderPadding} />
                    </Allotment.Pane>
                </Allotment>
            </Box>
            <ShortcutModal />
        </Stack>
    )
}
