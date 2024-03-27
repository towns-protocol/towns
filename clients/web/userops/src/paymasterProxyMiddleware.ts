import { UserOpsConfig } from './types'
import { ethers, BigNumber } from 'ethers'
import { BundlerJsonRpcProvider, IUserOperation, Presets } from 'userop'
import { z } from 'zod'
import { userOpsStore } from './userOpsStore'
import { Address, createSpaceDapp } from '@river/web3'
import { CodeException } from './errors'

type PaymasterProxyResponse = {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

const zSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    paymasterAndData: z.string().startsWith('0x'),
    preVerificationGas: z.string().startsWith('0x'),
    verificationGasLimit: z.string().startsWith('0x'),
    callGasLimit: z.string().startsWith('0x'),
})

type PaymasterProxyPostData = IUserOperation & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
}

export const paymasterProxyMiddleware: ({
    paymasterProxyAuthSecret,
    skipConfirmation,
}: {
    paymasterProxyAuthSecret: string
    skipConfirmation?: boolean
}) => UserOpsConfig['paymasterMiddleware'] =
    ({ skipConfirmation, paymasterProxyAuthSecret }) =>
    async (args) => {
        const { getState, setState } = userOpsStore

        const {
            userOpContext: ctx,
            rootKeyAddress,
            bundlerUrl,
            provider,
            aaRpcUrl: rpcUrl,
            functionHashForPaymasterProxy,
            townId,
            paymasterProxyUrl,
        } = args

        if (!getState().smartAccountAddress) {
            setState({ smartAccountAddress: ctx.op.sender as Address })
        }

        async function fallbackEstimate() {
            if (provider) {
                const spaceDapp = createSpaceDapp({
                    chainId: (await provider.getNetwork()).chainId,
                    provider,
                })
                try {
                    await Presets.Middleware.estimateUserOperationGas(
                        new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(bundlerUrl),
                    )({
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
                    })
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

                    const body = JSON.parse(_e.body ?? '{}') as
                        | {
                              error: {
                                  code?: string | number
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  data?: any
                                  message?: string
                              }
                          }
                        | undefined

                    const exception = new CodeException(
                        body?.error?.message ?? 'Error estimating gas for user operation',
                        body?.error?.code ?? 'UNKNOWN_ERROR',
                        body?.error?.data,
                    )

                    let spaceDappError: Error | undefined
                    // better logs
                    if (townId) {
                        spaceDappError = await spaceDapp.parseSpaceError(townId, exception)
                    } else {
                        spaceDappError = spaceDapp.parseSpaceFactoryError(exception)
                    }

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
            // get the estimate even if skipConfirmation is true
            // b/c it will throw an error we can parse
            const estimate = await fallbackEstimate()
            if (skipConfirmation) {
                return
            }
            await new Promise((resolve, reject) => {
                setState({
                    currOpGas: estimate,
                    confirm: () => {
                        setState({ currOpGas: undefined })
                        resolve('User confirmed!')
                    },
                    deny: () => {
                        setState({ currOpGas: undefined })
                        reject(new CodeException('user rejected user operation', 'ACTION_REJECTED'))
                    },
                })
            })
        }

        if (!paymasterProxyUrl) {
            console.warn(
                '[paymasterProxyMiddleware] paymasterProxyUrl is not set, using fallback gas estimate',
            )
            await waitForConfirmOrDeny()
            return
        }
        try {
            // TODO: ///////////////////////////
            // check here if the tx is a joinTown,
            // if so, check if there's a membership price
            // if so, check if the user has enough funds
            // if not enough funds, show the confirmation modal here first?
            ////////////////////////////////////

            // ethers.BigNumberish types are:
            // nonce, callGasLimit, verificationGasLimit, preVerificationGas, maxFeePerGas, maxPriorityFeePerGas
            const bigNumberishTypes = [
                'nonce',
                'callGasLimit',
                'verificationGasLimit',
                'preVerificationGas',
                'maxFeePerGas',
                'maxPriorityFeePerGas',
            ] as const
            if (!functionHashForPaymasterProxy) {
                throw new Error('functionHashForPaymasterProxy is required')
            }

            if (
                !townId &&
                functionHashForPaymasterProxy !== 'createSpace' &&
                functionHashForPaymasterProxy !== 'createSpace_linkWallet' &&
                functionHashForPaymasterProxy !== 'linkWallet' &&
                functionHashForPaymasterProxy !== 'removeLink'
            ) {
                throw new Error(
                    '[paymasterProxyMiddleware] townId is required for all user operations except createSpace, linkWallet, and removeLink',
                )
            }

            const userOp: PaymasterProxyPostData = {
                ...ctx.op,
                functionHash: functionHashForPaymasterProxy,
                rootKeyAddress: rootKeyAddress,
                townId: townId,
            }
            // convert all bigNumberish types to hex strings for paymaster proxy payload
            bigNumberishTypes.forEach((type) => {
                const value = userOp[type]
                userOp[type] = BigNumber.from(value).toHexString()
            })
            const sponsorUserOpUrl = `${paymasterProxyUrl}/api/sponsor-userop`
            const response = await fetch(sponsorUserOpUrl, {
                method: 'POST',
                body: JSON.stringify(userOp),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${paymasterProxyAuthSecret}`,
                },
            })
            const json = await response.json()

            if (!response.ok) {
                throw new Error(
                    `[paymasterProxyMiddleware] Error getting paymaster proxy response:: ${
                        response.status
                    } ${response.statusText} ${JSON.stringify(json)}`,
                )
            }

            const parseResult = zSchema.safeParse(json)
            if (!parseResult.success) {
                throw new Error(
                    `[paymasterProxyMiddleware] Error parsing PaymasterProxyResponse:: ${JSON.stringify(
                        parseResult.error,
                    )}`,
                )
            }
            ctx.op.paymasterAndData = parseResult.data.paymasterAndData
            ctx.op.preVerificationGas = parseResult.data.preVerificationGas
            ctx.op.verificationGasLimit = parseResult.data.verificationGasLimit
            ctx.op.callGasLimit = parseResult.data.callGasLimit
        } catch (error) {
            // if the paymaster responds with an error
            // just estimate the gas the same way Presets.SimpleAccount does when no paymaster is passed
            // meaning a user will have to pay for gas and this can still fail if they don't have funds
            console.error('[paymasterProxyMiddleware] using fallback gas estimate:', error)
            await waitForConfirmOrDeny()
        }
    }
