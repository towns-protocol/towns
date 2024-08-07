import { BundlerJsonRpcProvider, IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { ethers, BigNumberish } from 'ethers'
import { userOpsStore } from './userOpsStore'
import { CodeException, errorCategories } from './errors'
import { BaseChainConfig, ISpaceDapp } from '@river-build/web3'
import { TimeTracker, TimeTrackerEvents } from './types'

function increaseByPercentage({
    gas,
    multiplier,
    percentage = 10,
}: {
    gas: BigNumberish
    multiplier: number
    percentage?: number
}) {
    return (
        ethers.BigNumber.from(gas)
            // 1 -> 100%
            // 2 -> 110%
            // 3 -> 120%
            .mul(100 + (multiplier - 1) * percentage)
            .div(100)
    )
}

export function preverificationGasMultiplier(multiplier: number) {
    return (ctx: IUserOperationMiddlewareCtx) => {
        // retrying
        if (multiplier > 1) {
            userOpsStore.setState({ retryType: 'preVerification' })
        }
        ctx.op.preVerificationGas = increaseByPercentage({
            gas: ctx.op.preVerificationGas,
            multiplier,
        })
    }
}

export async function signUserOpHash(ctx: IUserOperationMiddlewareCtx, signer: ethers.Signer) {
    ctx.op.signature = await signer.signMessage(ethers.utils.arrayify(ctx.getUserOpHash()))
}

export function promptUser(
    preverificationGasMultiplier: number,
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
            provider,
            config,
            rpcUrl,
            bundlerUrl,
            spaceId,
        }: {
            provider: ethers.providers.Provider | undefined
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
                        rpcUrl,
                        bundlerUrl,
                    )

                    if (endEstimateGas) {
                        endEstimateGas?.()
                    }

                    ctx.op.preVerificationGas = increaseByPercentage({
                        gas: estimate.preVerificationGas,
                        multiplier: preverificationGasMultiplier,
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const _e = error as Error & { body?: any }

                    let body:
                        | {
                              error: {
                                  code?: string | number
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  data?: any
                                  message?: string
                              }
                          }
                        | undefined = undefined

                    try {
                        body = JSON.parse(_e.body ?? '{}')
                    } catch (error) {
                        // ignore
                        console.log('[paymasterProxyMiddleware] failed to parse error body', error)
                    }

                    const exception = new CodeException({
                        message: body?.error?.message ?? 'Error estimating gas for user operation',
                        code: body?.error?.code ?? 'UNKNOWN_ERROR',
                        data: body?.error?.data,
                        category: errorCategories.userop_non_sponsored,
                    })

                    // better logs
                    const spaceDappError = spaceDapp?.parseAllContractErrors({
                        spaceId: spaceId,
                        error: exception,
                    })

                    console.error(
                        '[paymasterProxyMiddleware] calling estimateUserOperationGas failed:',
                        {
                            originalError: exception,
                            parsedError: spaceDappError,
                        },
                    )

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
    rpcUrl: string,
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
        rpcUrl,
        bundlerUrl,
    )

    ctx.op.preVerificationGas = estimate.preVerificationGas
    ctx.op.verificationGasLimit = estimate.verificationGasLimit ?? estimate.verificationGas
    ctx.op.callGasLimit = estimate.callGasLimit
}

const estimateUserOperationGas = async (
    ctx: IUserOperationMiddlewareCtx,
    rpcUrl: string,
    bundlerUrl: string,
) => {
    const provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(bundlerUrl)

    let op:
        | IUserOperation
        | Pick<
              IUserOperation,
              'sender' | 'nonce' | 'initCode' | 'callData' | 'paymasterAndData' | 'signature'
          > = OpToJSON(ctx.op)

    if (bundlerUrl.includes('alchemy')) {
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
