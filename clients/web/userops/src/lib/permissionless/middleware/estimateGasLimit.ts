import { FunctionHash, TimeTracker, TimeTrackerEvents } from '../../../types'
import { errorCategories, errorToCodeException } from '../../../errors'
import {
    EstimateUserOperationGasParameters,
    SmartAccount,
    UserOperation,
    UserOperationRequest,
    estimateUserOperationGas,
} from 'viem/account-abstraction'
import { getAction } from 'viem/utils'
import { Client, parseEther } from 'viem'
import { ISpaceDapp } from '@river-build/web3'

export async function estimateGasLimit(args: {
    userOp: UserOperationRequest
    account: SmartAccount
    spaceId: string | undefined
    spaceDapp: ISpaceDapp | undefined
    timeTrackArgs?: {
        sequenceName?: TimeTrackerEvents | undefined
        timeTracker?: TimeTracker | undefined
        stepPrefix?: string | undefined
    }
    functionHashForPaymasterProxy?: FunctionHash
    client: Client
}) {
    const { userOp, spaceId, client, spaceDapp, account } = args
    const { sequenceName, timeTracker, stepPrefix } = args.timeTrackArgs ?? {}
    let request = userOp
    try {
        // this is a new estimate because at this point the paymaster would have rejected our operation
        // and we need an estimate to display to the user and to submit to the bundler
        let endEstimateGas: ((data?: Record<string, unknown>) => void) | undefined
        if (sequenceName && timeTracker) {
            endEstimateGas = timeTracker.startMeasurement(
                sequenceName,
                `userops_${stepPrefix}_estimate_user_operation_gas`,
            )
        }

        // If the Account has opinionated gas estimation logic, run the `estimateGas` hook and
        // fill the request with the prepared gas properties.
        if (account.userOperation?.estimateGas) {
            const gas = await account.userOperation.estimateGas(request as UserOperation)
            request = {
                ...request,
                ...gas,
            } as UserOperationRequest
        }

        // If not all the gas properties are already populated, we will need to estimate the gas
        // to fill the gas properties.

        const estimate = await getAction(
            client,
            estimateUserOperationGas,
            'estimateUserOperationGas',
        )({
            account,
            // Some Bundlers fail if nullish gas values are provided for gas estimation :') –
            // so we will need to set a default zeroish value.
            callGasLimit: 0n,
            preVerificationGas: 0n,
            verificationGasLimit: 0n,
            stateOverride: [
                {
                    address: account.address,
                    balance: parseEther('1000000'),
                },
            ],
            ...(request.paymaster
                ? {
                      paymasterPostOpGasLimit: 0n,
                      paymasterVerificationGasLimit: 0n,
                  }
                : {}),
            ...request,
        } as EstimateUserOperationGasParameters)

        if (endEstimateGas) {
            endEstimateGas?.()
        }

        return {
            ...estimate,
            preVerificationGas: increaseByPercentage({
                gas: estimate.preVerificationGas,
                percentage: 10,
            }),
        }
    } catch (error) {
        const exception = errorToCodeException(error, errorCategories.userop_non_sponsored)

        let parsedError: Error | undefined

        if (args.functionHashForPaymasterProxy === 'checkIn') {
            parsedError = spaceDapp?.airdrop?.riverPoints?.parseError(exception)
        }

        // better logs
        parsedError = spaceDapp?.parseAllContractErrors({
            spaceId,
            error: exception,
        })

        console.error('[promptUser] calling estimateUserOperationGas failed:', {
            op: userOp,
            originalError: exception,
            parsedError,
        })

        throw exception
    }
}

function increaseByPercentage({ gas, percentage }: { gas: bigint; percentage: number }) {
    const value = gas
    return value + (value * BigInt(percentage)) / 100n
}
