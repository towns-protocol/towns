import React from 'react'
import { userOpsStore } from '@towns/userops'
import {
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
} from 'use-towns-client'
import { Box } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

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
    function content() {
        if (!isAuthenticated) {
            return (
                <>
                    <ButtonSpinner /> Logging In...
                </>
            )
        }
        if (currOpGas) {
            // currOpGas means the confirmation tx modal is up
            return null
        }
        if (isJoining) {
            return (
                <>
                    <ButtonSpinner /> Joining...
                </>
            )
        }
        if (isAuthenticated && !isJoining) {
            // time between post-authentication and joining - isAuthenticated && !isJoining - what to put here?
            return (
                <>
                    <ButtonSpinner /> Joining...
                </>
            )
        }
        return null
    }

    // probably want to delay this a sec to allow privy iframe to show up
    return (
        <Box absoluteFill centerContent gap background="level2">
            {content()}
        </Box>
    )
}
