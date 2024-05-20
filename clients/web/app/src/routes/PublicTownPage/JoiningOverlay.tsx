import React from 'react'
import { userOpsStore } from '@towns/userops'
import {
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
} from 'use-towns-client'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'

// 1. logging in
// 2. joining - animation
//    a. creating base chain tx
//      - possible animation interruption if paid tx (currOpGas)
//    b. creating river space
//    c. creating default channel

export function JoiningOverlay() {
    const { isAuthenticated } = useConnectivity()
    const { currOpGas } = userOpsStore()
    const isJoining = useIsTransactionPending(BlockchainTransactionType.JoinSpace)

    function getAppProressState() {
        if (!isAuthenticated) {
            return AppProgressState.LoggingIn
        }
        if (currOpGas) {
            // currOpGas means the confirmation tx modal is up
            return AppProgressState.Joining
        }
        if (isJoining) {
            return AppProgressState.Joining
        }
        if (isAuthenticated && !isJoining) {
            // time between post-authentication and joining - isAuthenticated && !isJoining - what to put here?
            return AppProgressState.Joining
        }

        return AppProgressState.Joining
    }
    console.log('[app progress] JoiningOverlay', { isAuthenticated, currOpGas, isJoining })

    // probably want to delay this a sec to allow privy iframe to show up
    return (
        <AppProgressOverlayTrigger
            progressState={getAppProressState()}
            debugSource="joining overlay"
        />
    )
}
