import React, { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router'
import { useStartupTime } from 'StartupProvider'
import { trackTime } from 'hooks/useAnalytics'
import { AppProgressState, AppStartupTrack } from './AppProgressState'
import { useAppProgressStore } from './store/appProgressStore'

export const AppProgressOverlayTrigger = (props: {
    progressState: AppProgressState
    debugSource: string
}) => {
    const { setAppProgressOverlay, setOptimisticSpaceInitialized } = useAppProgressStore()
    const { progressState, debugSource } = props
    const [appStartTime] = useStartupTime()

    useEffect(() => {
        console.log('[app progress] trigger:', progressState, debugSource)
        return () => {
            console.log('[app progress] trigger cleanup:', progressState, debugSource)
            // if the workspace is initializing, at the final stage of the animation,
            // the unmount debugSource should have the string:
            //   'isRemoteDataLoaded === true|false, isLocalDataLoaded === true|false'
            const regex = /is(Remote|Local)DataLoaded/
            const isInitialized =
                progressState === AppProgressState.InitializingWorkspace && regex.test(debugSource)
            const isJoining = progressState === AppProgressState.Joining
            if (isInitialized || isJoining) {
                // Calculate the startup duration
                const startupDuration = performance.now() - appStartTime

                trackTime('[app startup]', {
                    stage: AppStartupTrack.ContentLoaded,
                    totalStartupTime: startupDuration,
                })
            }
        }
    }, [appStartTime, debugSource, progressState])

    const spaceId = matchPath('/t/:spaceId/*', useLocation().pathname)?.params.spaceId

    useEffect(() => {
        setAppProgressOverlay(props.progressState)
        return () => {
            setAppProgressOverlay(AppProgressState.None)
        }
    }, [props.progressState, setAppProgressOverlay])

    useEffect(() => {
        if (spaceId && props.progressState === AppProgressState.InitializingWorkspace) {
            return () => {
                setOptimisticSpaceInitialized(spaceId, true)
            }
        }
    }, [props.progressState, setOptimisticSpaceInitialized, spaceId])
    return <></>
}
