import { AnimatePresence, MotionProps } from 'framer-motion'
import React, { useEffect, useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { TransitionLogo } from '@components/Logo/Logo'
import { SetupAnimation } from '@components/SetupAnimation/SetupAnimation'
import { BoxProps, MotionStack, ZLayerProvider } from '@ui'
import { useStore } from 'store/store'
import { AppBugReportButton } from '@components/AppBugReport/AppBugReportButton'
import { trackTime } from 'hooks/useAnalytics'
import { AppOverlayDebugger } from './AppOverlayDebugger'
import { AppProgressOverlayKey, AppProgressState, toAppStartupTrack } from './AppProgressState'
import { AppSkeletonView } from './AppSkeletonView'
import { useAppProgressStore } from './store/appProgressStore'

export const AppProgressOverlay = (props: { debug?: boolean }) => {
    const spaceIdBookmark = useStore((s) => s.spaceIdBookmark)

    const { pathname } = useLocation()

    const spaceId = useMemo(() => {
        return matchPath('/t/:spaceId/*', pathname)?.params.spaceId //|| spaceIdBookmark
    }, [pathname])

    useEffect(() => {
        console.log('[routing] spaceIdBookmark:', spaceIdBookmark)
    }, [spaceId, spaceIdBookmark])

    useEffect(() => {
        console.log('[routing] spaceId:', spaceId)
    }, [spaceId])

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
        const showing = appProgressOverlay !== AppProgressState.None
        if (showing) {
            // track the time for each stage of the app startup
            trackTime('[app startup]', {
                stage: toAppStartupTrack(content.key),
            })
        }
        console.log('[app progress] overlay key:', {
            showing,
            overlay: appProgressOverlay,
            content: content.key,
        })
    }, [appProgressOverlay, content.key])

    return (
        <ZLayerProvider>
            <AnimatePresence mode="sync">
                {appProgressOverlay === AppProgressState.None ? null : (
                    <TransitionContainer
                        key={content.key}
                        data-test-id={`transition-container-${content.key}`}
                    >
                        {content.element}
                        {props.debug && <AppOverlayDebugger debugText={appProgressOverlay} />}
                        <AppBugReportButton topRight key="bug-report" />
                    </TransitionContainer>
                )}
            </AnimatePresence>
        </ZLayerProvider>
    )
}

export const useAppOverlayContent = (
    state: AppProgressState,
    isOptimisticInitialized: boolean,
): { key: AppProgressOverlayKey; element: JSX.Element } => {
    return useMemo(() => {
        if (state === AppProgressState.LoadingAssets) {
            return {
                key: AppProgressOverlayKey.Logo,
                element: <TransitionLogo key={AppProgressOverlayKey.Logo} />,
            }
        }
        if (state === AppProgressState.LoggingIn) {
            return isOptimisticInitialized
                ? // we think we have already initialized the space, show the
                  // skeleton instead of risking a flash of the setup animation
                  {
                      key: AppProgressOverlayKey.Skeleton,
                      element: <AppSkeletonView key="skeleton" />,
                  }
                : {
                      key: AppProgressOverlayKey.Logo,
                      element: <TransitionLogo key={AppProgressOverlayKey.Logo} />,
                  }
        }

        if (state === AppProgressState.InitializingWorkspace) {
            return isOptimisticInitialized
                ? // we think we have already initialized the space, show the
                  // skeleton instead of risking a flash of the setup animation
                  {
                      key: AppProgressOverlayKey.Skeleton,
                      element: <AppSkeletonView key={AppProgressOverlayKey.Skeleton} />,
                  }
                : {
                      key: AppProgressOverlayKey.Animation,
                      element: (
                          <SetupAnimation
                              mode={AppProgressState.InitializingWorkspace}
                              key={AppProgressOverlayKey.Animation}
                          />
                      ),
                  }
        }

        if (state === AppProgressState.Joining) {
            return {
                key: AppProgressOverlayKey.Animation,
                element: (
                    <SetupAnimation
                        mode={AppProgressState.Joining}
                        key={AppProgressOverlayKey.Animation}
                    />
                ),
            }
        }

        return {
            key: AppProgressOverlayKey.Logo,
            element: <TransitionLogo key={AppProgressOverlayKey.Logo} />,
        }
    }, [state, isOptimisticInitialized])
}

const transition = {
    initial: {
        opacity: 0,
        display: 'flex',
    },
    animate: {
        opacity: 1,
        display: 'flex',
        transition: { duration: 0.1, ease: 'easeOut' },
    },
    exit: {
        opacity: 0,
        transitionEnd: {
            display: 'none',
        },
        transition: { duration: 0.1, delay: 0.1 },
    },
} satisfies MotionProps

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
