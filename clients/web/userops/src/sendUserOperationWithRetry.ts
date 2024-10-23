import {
    CodeException,
    errorToCodeException,
    matchGasTooLowError,
    matchPrivyUnknownConnectorError,
} from './errors'
import { datadogLogs } from '@datadog/browser-logs'
import { TownsUserOpClient } from './TownsUserOpClient'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { MiddlewareVars } from './MiddlewareVars'
import { userOpsStore } from './userOpsStore'

export const sendUserOperationWithRetry = async (args: {
    userOpClient: TownsUserOpClient
    simpleAccount: TownsSimpleAccount
    retryCount?: number
    middlewareVars: MiddlewareVars
    skipPromptUserOnPMRejectedOp?: boolean
}) => {
    const {
        userOpClient,
        simpleAccount,
        retryCount,
        middlewareVars,
        skipPromptUserOnPMRejectedOp,
    } = args

    let attempt = 0
    let shouldTry = true
    let _error: CodeException | undefined = undefined

    while (shouldTry && attempt < (retryCount ?? 3)) {
        try {
            // Not tracking this event because it tracks all middlewares
            // This could include both a user hanging on the confirmation modal
            // As well as internal userop.js middlewares
            //
            // internal userop.js accounts for 1-2s of the total time
            //
            // instead, each middleware should be tracked individually
            // if we need to track internal userop.js middlewares and actual request for sending the user operation
            // then we need to extract the middlewares from userop.js, as well as the request
            //
            const res = await userOpClient.sendUserOperation(simpleAccount, {
                onBuild: (op) => {
                    console.log('[UserOperations] Signed UserOperation:', op)
                },
            })
            console.log('[UserOperations] userOpHash:', res.userOpHash)
            return res
        } catch (error) {
            const matchPrivyError = matchPrivyUnknownConnectorError(error)
            const matchGasError = matchGasTooLowError(error)

            if (matchPrivyError) {
                const { error: privyError } = matchPrivyError
                _error = privyError
                middlewareVars.operationAttempt = attempt++

                datadogLogs.logger.error('[UserOperations] privy unknown connector error', {
                    error,
                    codeException: privyError,
                    errorMessage: privyError.message,
                    operationAttempt: attempt,
                })
                // backoff for privy errors
                const delay = 2_000 * attempt
                console.warn(`Unknown connector error. Retry attempt ${attempt} after ${delay}ms`)
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }
            // if any gas too low errors, retry
            // https://docs.stackup.sh/docs/bundler-errors
            else if (matchGasError) {
                const { error: gasTooLowError, type } = matchGasError
                _error = gasTooLowError
                middlewareVars.operationAttempt = attempt++

                datadogLogs.logger.error('[UserOperations] gas too low error', {
                    error,
                    codeException: gasTooLowError,
                    errorMessage: gasTooLowError.message,
                    gasTooLowErrorType: type,
                    operationAttempt: attempt,
                })

                userOpsStore.setState({
                    retryDetails: {
                        type: 'gasTooLow',
                        data: type,
                    },
                })
                await new Promise((resolve) => setTimeout(resolve, 500))
                // this is a paid op. just retry until the user dismisses
                if (simpleAccount.getPaymasterAndData() === '0x' && !skipPromptUserOnPMRejectedOp) {
                    continue
                }

                continue
            } else {
                shouldTry = false
                _error = errorToCodeException(
                    error,
                    simpleAccount.getPaymasterAndData() !== '0x'
                        ? 'userop_sponsored'
                        : 'userop_non_sponsored',
                )
            }
        }
    }
    throw _error
}
