import { Allotment, AllotmentHandle } from 'allotment'
import React, { useMemo, useRef } from 'react'
import { Outlet, useMatch } from 'react-router'
import { DirectMessages } from '@components/DirectMessages/DirectMessages'
import { PotentiallyUnusedSuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { usePrepopulateChannels } from '@components/SearchModal/hooks/usePrepopulateChannels'
import { ShortcutModal } from '@components/Shortcuts/ShortcutModal'
import { MainSideBar, SpaceSideBar } from '@components/SideBars'
import { SpaceSidebarLoadingPlaceholder } from '@components/SideBars/SpaceSideBar/SpaceSideBarLoading'
import { Box, Stack } from '@ui'
import { useContractAndServerSpaceData } from 'hooks/useContractAndServerSpaceData'
import { usePersistPanes } from 'hooks/usePersistPanes'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PATHS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { SearchModal } from '@components/SearchModal/SearchModal'
import * as styles from './AppPanelLayout.css'
import { PersistAndFadeWelcomeLogo } from './WelcomeLayout'

export const AppPanelLayout = () => {
    const allotemntRef = useRef<AllotmentHandle>(null)
    const messageRoute = useMatch({ path: `/${PATHS.MESSAGES}`, end: false })
    const homeRoute = useMatch({ path: '/home', end: true })
    const spacesNewRoute = useMatch({ path: `/${PATHS.SPACES}/new`, end: true })
    const spacesSettingsRoute = useMatch({ path: `/${PATHS.SPACES}/:space/settings`, end: false })

    const { serverSpace: space } = useContractAndServerSpaceData()
    const config = ['spaces', 'primary-menu', 'secondary-menu', 'content']
    const { onSizesChange, sizes } = usePersistPanes(config)

    const isMessagesRoute = !!messageRoute

    // we still want to show town drawer event when space is loading, so we
    // can't rely on `space` being defined
    const hasTownRoute = !!useSpaceIdFromPathname() || space

    const displaySpacePanel =
        hasTownRoute && (!(spacesSettingsRoute || spacesNewRoute || homeRoute) || isMessagesRoute)

    const channels = useSpaceChannels()
    const preloadIds = useMemo(() => channels.map((c) => c.id), [channels])

    usePrepopulateChannels(preloadIds)

    return (
        <Stack horizontal grow borderTop position="relative">
            <Box absoluteFill>
                <Allotment
                    // proportionalLayout
                    ref={allotemntRef}
                    className={atoms({ minHeight: '100%' })}
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
                            <DirectMessages />
                        ) : space ? (
                            <SpaceSideBar
                                space={space}
                                className={styles.allotmentResizeBorderPadding}
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
            <PersistAndFadeWelcomeLogo />
            <ShortcutModal />
            <SearchModal />
        </Stack>
    )
}
