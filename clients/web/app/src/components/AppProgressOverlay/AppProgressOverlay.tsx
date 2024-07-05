import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { TransitionLogo } from '@components/Logo/Logo'
import { SetupAnimation } from '@components/SetupAnimation/SetupAnimation'
import { BoxProps, MotionStack, ZLayerProvider } from '@ui'
import { useStore } from 'store/store'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'
import { AppOverlayDebugger } from './AppOverlayDebugger'
import { AppProgressState } from './AppProgressState'
import { AppSkeletonView } from './AppSkeletonView'
import { useAppProgressStore } from './store/appProgressStore'

export const AppProgressOverlay = (props: { debug?: boolean }) => {
    const spaceIdBookmark = useStore((s) => s.spaceIdBookmark)
    const spaceId =
        matchPath('/t/:spaceId/*', useLocation().pathname)?.params.spaceId || spaceIdBookmark

    const { appProgressOverlay, isOptimisticInitialized } = useAppProgressStore(
        ({ appProgressOverlay, optimisticInitializedSpaces }) => ({
            appProgressOverlay,
            isOptimisticInitialized: optimisticInitializedSpaces.some((id) => id === spaceId),
        }),
    )

    const content = useAppOverlayContent(appProgressOverlay, isOptimisticInitialized)

    useEffect(() => {
        console.log('[app progress] initialized')
    }, [])

    useEffect(() => {
        console.log('[app progress] overlay:', appProgressOverlay)
    }, [appProgressOverlay])

    useEffect(() => {
        console.log('[app progress] overlay key:', content.key)
    }, [appProgressOverlay, content.key])

    return (
        <ZLayerProvider>
            <AnimatePresence mode="sync">
                {appProgressOverlay !== AppProgressState.None ? (
                    <>
                        <TransitionContainer key={content.key}>
                            {content.element}
                            {props.debug && <AppOverlayDebugger debugText={appProgressOverlay} />}
                        </TransitionContainer>
                        <AppBugReportButton topRight />
                    </>
                ) : null}
            </AnimatePresence>
        </ZLayerProvider>
    )
}

export const useAppOverlayContent = (
    state: AppProgressState,
    isOptimisticInitialized: boolean,
): { key: 'logo' | 'skeleton' | 'animation'; element: JSX.Element } => {
    return useMemo(() => {
        if (state === AppProgressState.LoadingAssets) {
            return { key: 'logo', element: <TransitionLogo key="logo" /> }
        }
        if (state === AppProgressState.LoggingIn) {
            return isOptimisticInitialized
                ? // we think we have already initialized the space, show the
                  // skeleton instead of risking a flash of the setup animation
                  { key: 'skeleton', element: <AppSkeletonView key="skeleton" /> }
                : { key: 'logo', element: <TransitionLogo key="logo" /> }
        }

        if (state === AppProgressState.InitializingWorkspace) {
            return isOptimisticInitialized
                ? // we think we have already initialized the space, show the
                  // skeleton instead of risking a flash of the setup animation
                  { key: 'skeleton', element: <AppSkeletonView key="skeleton" /> }
                : {
                      key: 'animation',
                      element: (
                          <SetupAnimation
                              mode={AppProgressState.InitializingWorkspace}
                              key="animation"
                          />
                      ),
                  }
        }

        if (state === AppProgressState.Joining) {
            return {
                key: 'animation',
                element: <SetupAnimation mode={AppProgressState.Joining} key="animation" />,
            }
        }

        return { key: 'logo', element: <TransitionLogo key="logo" /> }
    }, [state, isOptimisticInitialized])
}

const transition = {
    exit: {
        opacity: 0,
        transitionEnd: {
            display: 'none',
        },
        transition: { duration: 0.4, delay: 0.2 },
    },
} as const

export const TransitionContainer = (props: Pick<BoxProps, 'children' | 'background'>) => {
    return (
        <MotionStack
            centerContent
            absoluteFill
            background="level1"
            {...transition}
            height="100dvh"
            {...props}
        />
    )
}
