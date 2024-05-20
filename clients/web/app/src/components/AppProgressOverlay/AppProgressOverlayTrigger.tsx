import React, { useEffect } from 'react'
import { matchPath, useLocation } from 'react-router'
import { AppProgressState } from './AppProgressState'
import { useAppProgressStore } from './store/appProgressStore'

export const AppProgressOverlayTrigger = (props: {
    progressState: AppProgressState
    debugSource: string
}) => {
    const { setAppProgressOverlay, setOptimisticSpaceInitialized } = useAppProgressStore()
    const { progressState, debugSource } = props

    useEffect(() => {
        console.log('[app progress] trigger:', progressState, debugSource)
        return () => {
            console.log('[app progress] trigger cleanup:', progressState, debugSource)
        }
    }, [debugSource, progressState])

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
