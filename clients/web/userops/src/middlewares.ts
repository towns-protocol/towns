import { BundlerJsonRpcProvider, IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { ethers, BigNumberish } from 'ethers'
import { userOpsStore } from './userOpsStore'
import { CodeException, errorCategories, errorToCodeException } from './errors'
import { BaseChainConfig, ISpaceDapp } from '@river-build/web3'
import { TimeTracker, TimeTrackerEvents } from './types'
import { BigNumber } from 'ethers'
import { getGasPrice as getEthMaxPriorityFeePerGas } from 'userop/dist/preset/middleware'
import { isUsingAlchemyBundler } from './utils'

function increaseByPercentage({ gas, percentage }: { gas: BigNumberish; percentage: number }) {
    return ethers.BigNumber.from(gas)
        .mul(100 + percentage)
        .div(100)
}

export async function signUserOpHash(ctx: IUserOperationMiddlewareCtx, signer: ethers.Signer) {
    ctx.op.signature = await signer.signMessage(ethers.utils.arrayify(ctx.getUserOpHash()))
}

export function promptUser(
    spaceDapp: ISpaceDapp | undefined,
    value?: ethers.BigNumberish,
    timeTrackArgs?: {
        sequenceName?: TimeTrackerEvents | undefined
        timeTracker?: TimeTracker | undefined
        stepPrefix?: string | undefined
    },
) {
    const { sequenceName, timeTracker, stepPrefix } = timeTrackArgs ?? {}
    return async function (
        ctx: IUserOperationMiddlewareCtx,
        {
            bundlerProvider: provider,
            config,
            bundlerUrl,
            spaceId,
        }: {
            bundlerProvider: BundlerJsonRpcProvider | undefined
            config: BaseChainConfig | undefined
            rpcUrl: string
            bundlerUrl: string
            spaceId: string | undefined
        },
    ) {
        // sponsored op, no need to prompt
        if (ctx.op.paymasterAndData !== '0x') {
            return
        }

        async function fallbackEstimate() {
            if (provider && config) {
                try {
                    // this is a new estimate because at this point the paymaster would have rejected our operation
                    // and we need an estimate to display to the user and to submit to the bundler
                    let endEstimateGas: ((endSequence?: boolean) => void) | undefined
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
                                    balance: ethers.utils.parseEther('1000000').toHexString(),
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
                    ctx.op.verificationGasLimit =
                        estimate.verificationGasLimit ?? estimate.verificationGas
                    ctx.op.callGasLimit = estimate.callGasLimit

                    return {
                        maxFeePerGas: ctx.op.maxFeePerGas,
                        maxPriorityFeePerGas: ctx.op.maxPriorityFeePerGas,
                        preverificationGas: ctx.op.preVerificationGas,
                        verificationGasLimit: ctx.op.verificationGasLimit,
                        callGasLimit: ctx.op.callGasLimit,
                    }
                } catch (error: unknown) {
                    const exception = errorToCodeException(
                        error,
                        errorCategories.userop_non_sponsored,
                    )

                    // better logs
                    const spaceDappError = spaceDapp?.parseAllContractErrors({
                        spaceId: spaceId,
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
        }

        async function waitForConfirmOrDeny() {
            // b/c it will throw an error we can parse
            const estimate = await fallbackEstimate()
            await new Promise((resolve, reject) => {
                userOpsStore.setState({
                    currOpGas: estimate,
                    currOpValue: value && ethers.BigNumber.from(value).gt(0) ? value : undefined,
                    confirm: () => {
                        userOpsStore.getState().clear()
                        resolve('User confirmed!')
                    },
                    deny: () => {
                        userOpsStore.getState().clear()
                        reject(
                            new CodeException({
                                message: 'User rejected user operation',
                                code: 'ACTION_REJECTED',
                                category: 'misc',
                            }),
                        )
                    },
                })
            })
        }

        await waitForConfirmOrDeny()
    }
}

type GasEstimate = {
    preVerificationGas: BigNumberish
    verificationGasLimit: BigNumberish
    callGasLimit: BigNumberish

    // TODO: remove this with EntryPoint v0.7
    verificationGas: BigNumberish
}

export const simpleEstimateGas = async (
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
    bundlerUrl: string,
) => {
    if (ctx.op.paymasterAndData !== '0x') {
        return
    }

    const estimate = await estimateUserOperationGas(
        {
            ...ctx,
            stateOverrides: {
                [ctx.op.sender]: {
                    balance: ethers.utils.parseEther('1000000').toHexString(),
                },
            },
        },
        provider,
        bundlerUrl,
    )

    ctx.op.preVerificationGas = estimate.preVerificationGas
    ctx.op.verificationGasLimit = estimate.verificationGasLimit ?? estimate.verificationGas
    ctx.op.callGasLimit = estimate.callGasLimit
}

const estimateUserOperationGas = async (
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
    bundlerUrl: string,
) => {
    let op:
        | IUserOperation
        | Pick<
              IUserOperation,
              'sender' | 'nonce' | 'initCode' | 'callData' | 'paymasterAndData' | 'signature'
          > = OpToJSON(ctx.op)

    if (isUsingAlchemyBundler(bundlerUrl)) {
        op = {
            sender: op.sender,
            nonce: op.nonce,
            initCode: op.initCode,
            callData: op.callData,
            paymasterAndData: op.paymasterAndData,
            signature: op.signature,
        }
    }

    const est = (await provider.send('eth_estimateUserOperationGas', [
        op,
        ctx.entryPoint,
        // make sure to include stateOverrides for users w/o funds!
        ctx.stateOverrides,
    ])) as GasEstimate

    return est
}

export const OpToJSON = (op: IUserOperation): IUserOperation => {
    return Object.keys(op)
        .map((key) => {
            let val = op[key as unknown as keyof IUserOperation]
            if (typeof val !== 'string' || !val.startsWith('0x')) {
                val = ethers.utils.hexValue(val)
            }
            return [key, val]
        })
        .reduce(
            (set, [k, v]) => ({
                ...set,
                [k]: v,
            }),
            {},
        ) as IUserOperation
}

// calculate maxFeePerGas and maxPriorityFeePerGas
export async function estimateAlchemyGasFees(
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
) {
    if (ctx.op.paymasterAndData !== '0x') {
        return
    }

    try {
        // https://docs.alchemy.com/reference/bundler-api-fee-logic
        const [fee, block] = await Promise.all([
            provider.send('rundler_maxPriorityFeePerGas', []),
            provider.getBlock('latest'),
        ])

        const tip = BigNumber.from(fee)
        const maxPriorityFeePerGasBuffer = tip.div(100).mul(25)
        const maxPriorityFeePerGas = tip.add(maxPriorityFeePerGasBuffer)
        const maxFeePerGas = block.baseFeePerGas
            ? block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas)
            : maxPriorityFeePerGas

        ctx.op.maxFeePerGas = maxFeePerGas
        ctx.op.maxPriorityFeePerGas = maxPriorityFeePerGas
    } catch (error) {
        // fallback to using eth_getMaxPriorityFeePerGas
        await getEthMaxPriorityFeePerGas(provider)(ctx)
    }
}
