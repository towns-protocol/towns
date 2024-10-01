import { BundlerJsonRpcProvider, IUserOperationMiddlewareCtx } from 'userop'
import { utils } from 'ethers'
import { estimateUserOperationGas } from './estimateUserOperationGas'
import { TimeTracker, TimeTrackerEvents } from '../types'
import { BigNumber, BigNumberish } from 'ethers'
import { errorCategories, errorToCodeException } from '../errors'
import { ISpaceDapp } from '@river-build/web3'
import { OpToJSON } from '../utils'

export async function estimateGasLimit(args: {
    ctx: IUserOperationMiddlewareCtx
    provider: BundlerJsonRpcProvider
    bundlerUrl: string
    spaceId: string | undefined
    spaceDapp: ISpaceDapp | undefined
    timeTrackArgs?: {
        sequenceName?: TimeTrackerEvents | undefined
        timeTracker?: TimeTracker | undefined
        stepPrefix?: string | undefined
    }
}) {
    const { ctx, provider, bundlerUrl, spaceDapp, spaceId } = args
    const { sequenceName, timeTracker, stepPrefix } = args.timeTrackArgs ?? {}
    // sponsored op, no need to prompt
    if (ctx.op.paymasterAndData !== '0x') {
        return
    }

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
        const estimate = await estimateUserOperationGas(
            {
                ...ctx,
                // if a user operation requires a VALUE (not gas) - currently only joinTown on a fixed price space would have one - the paymaster is going to reject it
                // estimateUserOperationGas will also reject if the user does not have enough funds to cover the VALUE
                // the UI can handle low funds how it wants (and a user may not even need funds if they're going to use credit card)
                // so we're overriding the balance of the sender to a high number to avoid the rejection, so this will always return a gas estimate
                stateOverrides: {
                    [ctx.op.sender]: {
                        balance: utils.parseEther('1000000').toHexString(),
                    },
                },
            },
            provider,
            bundlerUrl,
        )

        if (endEstimateGas) {
            endEstimateGas?.()
        }

        ctx.op.preVerificationGas = increaseByPercentage({
            gas: estimate.preVerificationGas,
            percentage: 10,
        })
        ctx.op.verificationGasLimit = estimate.verificationGasLimit ?? estimate.verificationGas
        ctx.op.callGasLimit = estimate.callGasLimit
    } catch (error) {
        const exception = errorToCodeException(error, errorCategories.userop_non_sponsored)

        // better logs
        const spaceDappError = spaceDapp?.parseAllContractErrors({
            spaceId,
            error: exception,
        })

        console.error('[promptUser] calling estimateUserOperationGas failed:', {
            op: OpToJSON(ctx.op),
            originalError: exception,
            parsedError: spaceDappError,
        })

        throw exception
    }
}

function increaseByPercentage({ gas, percentage }: { gas: BigNumberish; percentage: number }) {
    return BigNumber.from(gas)
        .mul(100 + percentage)
        .div(100)
}
