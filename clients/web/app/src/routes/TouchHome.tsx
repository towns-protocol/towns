import React, { useCallback, useState } from 'react'
import { useSpaceData, useSpaceMentions } from 'use-zion-client'
import { ErrorBoundary } from '@sentry/react'
import { AnimatePresence } from 'framer-motion'
import { Outlet } from 'react-router'
import { SyncedChannelList } from '@components/SideBars/SpaceSideBar/SyncedChannelList'
import { TouchLayoutHeader } from '@components/TouchLayoutHeader/TouchLayoutHeader'
import { Box, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { SomethingWentWrong } from '@components/Errors/SomethingWentWrong'
import { TouchHomeOverlay } from '@components/TouchHomeOverlay/TouchHomeOverlay'
import { TouchTabBarLayout } from './layouts/TouchTabBarLayout'

type Overlay = undefined | 'main-panel' | 'direct-messages'

export const TouchHome = () => {
    const space = useSpaceData()
    const mentions = useSpaceMentions()
    const spaceData = useSpaceData()
    const isLoadingChannels = spaceData?.isLoadingChannels ?? true

    const [activeOverlay, setActiveOverlay] = useState<Overlay>(undefined)

    const onDisplayMainPanel = useCallback(() => {
        setActiveOverlay('main-panel')
    }, [])

    return (
        <ErrorBoundary fallback={ErrorFallbackComponent}>
            <TouchTabBarLayout>
                <Stack absoluteFill>
                    <TouchLayoutHeader onDisplayMainPanel={onDisplayMainPanel} />
                    <Box scroll grow>
                        <Box minHeight="forceScroll">
                            {space && !isLoadingChannels ? (
                                <SyncedChannelList
                                    space={space}
                                    mentions={mentions}
                                    canCreateChannel={false}
                                />
                            ) : (
                                <Box absoluteFill centerContent>
                                    <ButtonSpinner />
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Stack>
                <Outlet />
            </TouchTabBarLayout>
            <AnimatePresence>
                {activeOverlay === 'main-panel' && (
                    <TouchHomeOverlay onClose={() => setActiveOverlay(undefined)} />
                )}
            </AnimatePresence>
        </ErrorBoundary>
    )
}

const ErrorFallbackComponent = (props: { error: Error }) => {
    return (
        <Box centerContent absoluteFill>
            <SomethingWentWrong error={props.error} />
        </Box>
    )
}
