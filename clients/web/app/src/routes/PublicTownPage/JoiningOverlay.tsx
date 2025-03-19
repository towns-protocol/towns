import React from 'react'
import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import {
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
} from 'use-towns-client'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { useAppProgressStore } from '@components/AppProgressOverlay/store/appProgressStore'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

// 1. logging in
// 2. joining - animation
//    a. creating base chain tx
//      - possible animation interruption if paid tx (currOpGas)
//    b. creating river space
//    c. creating default channel

export function JoiningOverlay() {
    const { isAuthenticated } = useConnectivity()
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOp = userOpsStore((s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current)

    const spaceId = useSpaceIdFromPathname()
    const { isOptimisticInitialized } = useAppProgressStore(({ optimisticInitializedSpaces }) => ({
        isOptimisticInitialized: optimisticInitializedSpaces.some((id) => id === spaceId),
    }))

    const isJoining = useIsTransactionPending(BlockchainTransactionType.JoinSpace)

    function getAppProressState() {
        if (!isAuthenticated) {
            return AppProgressState.LoggingIn
        }
        if (currOp.op) {
            return AppProgressState.Joining
        }

        if (isOptimisticInitialized) {
            // we clicked on join but it seems like we're actually part of the town
            return AppProgressState.LoggingIn
        }

        return AppProgressState.Joining
    }
    console.log('[app progress] JoiningOverlay', { isAuthenticated, currOp, isJoining })

    // probably want to delay this a sec to allow privy iframe to show up
    return (
        <AppProgressOverlayTrigger
            progressState={getAppProressState()}
            debugSource="joining overlay"
        />
    )
}
