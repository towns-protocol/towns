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
import { selectUserOpsByAddress, userOpsStore } from '../store/userOpsStore'
import { IUserOperation } from 'userop'
import { SendUserOperationReturnType } from './types'
import { Hex } from 'viem'
import { TSmartAccount } from './permissionless/accounts/createSmartAccountClient'
export async function sendUserOperationWithRetry(args: {
    userOpClient: TownsUserOpClient
    simpleAccount: TownsSimpleAccount
    onBuild?: (op: IUserOperation) => void
    retryCount?: number
}): Promise<SendUserOperationReturnType>

export async function sendUserOperationWithRetry(args: {
    smartAccount: TSmartAccount
    onBuild?: (op: IUserOperation) => void
    retryCount?: number
    callData: Hex
}): Promise<SendUserOperationReturnType>

export async function sendUserOperationWithRetry(args: {
    userOpClient?: TownsUserOpClient
    simpleAccount?: TownsSimpleAccount
    smartAccount?: TSmartAccount
    onBuild?: (op: IUserOperation) => void
    retryCount?: number
    callData?: Hex
}): Promise<SendUserOperationReturnType> {
    const { userOpClient, simpleAccount, smartAccount, retryCount, callData } = args
    const { setOperationAttempt, setRetryDetails } = userOpsStore.getState()

    let attempt = 0
    let shouldTry = true
    let _error: CodeException | undefined = undefined

    while (shouldTry && attempt < (retryCount ?? 3)) {
        try {
            if (userOpClient && simpleAccount) {
                const res = await userOpClient.sendUserOperation(simpleAccount, {
                    onBuild: (op) => {
                        console.log('[UserOperations] Signed UserOperation:', op)
                        args.onBuild?.(op)
                    },
                })
                console.log('[UserOperations] userOpHash:', res.userOpHash)
                return res
            } else if (smartAccount && callData) {
                const res = await smartAccount.sendUserOperation({
                    callData,
                })
                return res
            }
            throw new Error('[sendUserOperationWithRetry] missing userOpClient or smartAccount')
        } catch (error) {
            const matchPrivyError = matchPrivyUnknownConnectorError(error)
            const matchGasError = matchGasTooLowError(error)
            const replacementUnderpriced = matchReplacementUnderpriced(error)

            const storedOp = selectUserOpsByAddress(smartAccount?.address).current.op

            const senderAddress = simpleAccount
                ? simpleAccount.getSenderAddress()
                : smartAccount?.address
            const paymasterAndData = simpleAccount
                ? simpleAccount.getPaymasterAndData()
                : storedOp?.paymasterAndData

            if (!senderAddress) {
                throw new Error('[sendUserOperationWithRetry] missing senderAddress')
            }

            if (matchPrivyError) {
                const { error: privyError } = matchPrivyError
                _error = privyError
                setOperationAttempt(senderAddress, attempt++)

                datadogLogs.logger.error('[UserOperations] privy unknown connector error', {
                    error,
                    codeException: privyError,
                    errorMessage: privyError.message,
                    operationAttempt: attempt,
                })
                // backoff for privy errors
                const delay = process.env.NODE_ENV === 'test' ? 0 : 2_000 * attempt
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
                setOperationAttempt(senderAddress, attempt++)

                datadogLogs.logger.error('[UserOperations] gas too low error', {
                    error,
                    codeException: gasTooLowError,
                    errorMessage: gasTooLowError.message,
                    gasTooLowErrorType: type,
                    operationAttempt: attempt,
                })

                setRetryDetails(senderAddress, {
                    type: 'gasTooLow',
                    data: type,
                })
                await new Promise((resolve) => setTimeout(resolve, 500))
                // this is a paid op. just retry until the user dismisses
                if (paymasterAndData === undefined || paymasterAndData === '0x') {
                    continue
                }

                continue
            } else {
                shouldTry = false
                _error = errorToCodeException(
                    error,
                    paymasterAndData === undefined || paymasterAndData === '0x'
                        ? 'userop_non_sponsored'
                        : 'userop_sponsored',
                )
            }
        }
    }
    throw _error
}
