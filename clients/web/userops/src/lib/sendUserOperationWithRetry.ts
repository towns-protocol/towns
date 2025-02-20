import {
    CodeException,
    errorToCodeException,
    matchGasTooLowError,
    matchPrivyUnknownConnectorError,
    matchReplacementUnderpriced,
} from '../errors'
import { datadogLogs } from '@datadog/browser-logs'
import { TownsUserOpClient } from './useropjs/TownsUserOpClient'
import { TownsSimpleAccount } from './useropjs/TownsSimpleAccount'
import { userOpsStore } from '../store/userOpsStore'
import { IUserOperation } from 'userop'

export const sendUserOperationWithRetry = async (args: {
    userOpClient: TownsUserOpClient
    simpleAccount: TownsSimpleAccount
    onBuild?: (op: IUserOperation) => void
    retryCount?: number
}) => {
    const { userOpClient, simpleAccount, retryCount } = args
    const { setOperationAttempt, setRetryDetails } = userOpsStore.getState()

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
                    args.onBuild?.(op)
                },
            })
            console.log('[UserOperations] userOpHash:', res.userOpHash)
            return res
        } catch (error) {
            const matchPrivyError = matchPrivyUnknownConnectorError(error)
            const matchGasError = matchGasTooLowError(error)
            const replacementUnderpriced = matchReplacementUnderpriced(error)

            if (matchPrivyError) {
                const { error: privyError } = matchPrivyError
                _error = privyError
                setOperationAttempt(simpleAccount.getSenderAddress(), attempt++)

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
            } else if (replacementUnderpriced) {
                // TODO:
                // gas estimation for replacement underpriced is baked into the middleware - any time a userop is prepared,
                // any pending op is checked and replacement gas is estimated if applicable
                //
                // we don't need to auto retry here, as it adds complication in the case that a pending op lands in between retries and the retried op has the wrong nonce
                // which opens the door for a number of possible edge cases
                //
                // if the replacement gas wasn't enough and we get this error, subsequent manual retries should succeed
                // this is still an improvement over the previous behavior where we didn't estimate replacement gas, so any retry had a high chance of failure
                //
                // it's a tradeoff between UX and complexity that we can revisit in the future
                // error tracking should help inform of how severe this issue is now that we're estimating replacement gas,
                const { error: replacementUnderpricedError } = replacementUnderpriced
                _error = replacementUnderpricedError
                shouldTry = false
            }
            // if any gas too low errors, retry
            // https://docs.stackup.sh/docs/bundler-errors
            else if (matchGasError) {
                const { error: gasTooLowError, type } = matchGasError
                _error = gasTooLowError
                setOperationAttempt(simpleAccount.getSenderAddress(), attempt++)

                datadogLogs.logger.error('[UserOperations] gas too low error', {
                    error,
                    codeException: gasTooLowError,
                    errorMessage: gasTooLowError.message,
                    gasTooLowErrorType: type,
                    operationAttempt: attempt,
                })

                setRetryDetails(simpleAccount.getSenderAddress(), {
                    type: 'gasTooLow',
                    data: type,
                })
                await new Promise((resolve) => setTimeout(resolve, 500))
                // this is a paid op. just retry until the user dismisses
                if (simpleAccount.getPaymasterAndData() === '0x') {
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
