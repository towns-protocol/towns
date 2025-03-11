import { type Chain, type Client, type Transport, concat, encodeFunctionData } from 'viem'
import {
    type PrepareUserOperationParameters,
    type PrepareUserOperationRequest,
    type PrepareUserOperationReturnType,
    type SmartAccount,
    type UserOperation,
    UserOperationRequest,
} from 'viem/account-abstraction'
import { parseAccount } from 'viem/accounts'
import { getAction } from 'viem/utils'
import { estimateGasFeesWithReplacement } from './middleware/estimateGasFees'
import { isUsingAlchemyBundler } from '../../utils/isUsingAlchemyBundler'
import { paymasterProxyMiddleware } from './middleware/paymaster'
import { isSponsoredOp } from '../../utils/isSponsoredOp'
import {
    selectUserOpsByAddress,
    userOpsStore,
    viemOpDetailsToEthersOpDetails,
} from '../../store/userOpsStore'
import { estimateGasLimit } from './middleware/estimateGasLimit'
import { totalCostOfUserOp } from './middleware/balance'
import { promptUser } from '../../store/promptUser'
import { InsufficientTipBalanceException } from '../../errors'
import { getBalance } from 'viem/actions'
import { BigNumber } from 'ethers'
import { subtractGasFromBalance } from './middleware/substractGasFromValue'
import { Call } from 'viem/types/calls'
import { SmartAccountClient } from 'permissionless'
import { ISpaceDapp } from '@river-build/web3'

const defaultParameters = ['factory', 'fees', 'gas', 'paymaster', 'nonce', 'signature'] as const

export const prepareUserOperation =
    ({
        bundlerUrl,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
        spaceDapp,
        rootKeyAddress,
        fetchAccessTokenFn,
    }: {
        bundlerUrl: string
        paymasterProxyUrl: string
        paymasterProxyAuthSecret: string
        spaceDapp: ISpaceDapp | undefined
        fetchAccessTokenFn: (() => Promise<string | null>) | undefined
        rootKeyAddress: string
    }) =>
    async <
        account extends SmartAccount | undefined,
        const calls extends readonly unknown[],
        const request extends PrepareUserOperationRequest<account, accountOverride, calls>,
        accountOverride extends SmartAccount | undefined = undefined,
    >(
        client: Client<Transport, Chain | undefined, account>,
        parameters_: PrepareUserOperationParameters<account, accountOverride, calls, request>,
    ): Promise<PrepareUserOperationReturnType<account, accountOverride, calls, request>> => {
        const parameters = parameters_ as PrepareUserOperationParameters
        const {
            account: account_ = client.account,
            parameters: properties = defaultParameters,
            // stateOverride,
        } = parameters

        if (!account_) throw new Error('Account not found')
        const account = parseAccount(account_)

        const bundlerClient = client as unknown as SmartAccountClient
        const rpcClient = bundlerClient.client
        if (!rpcClient) throw new Error('RPC client not found')

        let request = {
            ...parameters,
            sender: account.address,
        } as PrepareUserOperationRequest

        ////////////////////////////////////////////////////////////////////////////////
        // Concurrently prepare properties required to fill the User Operation.
        ////////////////////////////////////////////////////////////////////////////////

        const [callData, factory, nonce] = await Promise.all([
            (async () => {
                if (parameters.calls)
                    return account.encodeCalls(
                        parameters.calls.map((call_) => {
                            const call = call_ as Call

                            if (call.abi)
                                return {
                                    data: encodeFunctionData(call),
                                    to: call.to,
                                    value: call.value,
                                } as Call
                            return call
                        }),
                    )
                return parameters.callData
            })(),
            (async () => {
                if (!properties.includes('factory')) return undefined
                if (parameters.initCode) return { initCode: parameters.initCode }
                if (parameters.factory && parameters.factoryData) {
                    return {
                        factory: parameters.factory,
                        factoryData: parameters.factoryData,
                    }
                }

                const { factory, factoryData } = await account.getFactoryArgs()

                if (account.entryPoint.version === '0.6') {
                    return {
                        initCode:
                            factory && factoryData ? concat([factory, factoryData]) : undefined,
                    }
                }
                return {
                    factory,
                    factoryData,
                }
            })(),
            (async () => {
                if (!properties.includes('nonce')) return undefined
                if (typeof parameters.nonce === 'bigint') return parameters.nonce
                return account.getNonce()
            })(),
        ])

        ////////////////////////////////////////////////////////////////////////////////
        // Fill User Operation with the prepared properties from above.
        ////////////////////////////////////////////////////////////////////////////////

        if (typeof callData !== 'undefined') request.callData = callData
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        if (typeof factory !== 'undefined') request = { ...request, ...(factory as any) }
        if (typeof nonce !== 'undefined') request.nonce = nonce

        ////////////////////////////////////////////////////////////////////////////////
        // Fill User Operation with the `signature` property.
        ////////////////////////////////////////////////////////////////////////////////

        if (properties.includes('signature')) {
            if (typeof parameters.signature !== 'undefined')
                request.signature = parameters.signature
            else request.signature = await account.getStubSignature(request as UserOperation)
        }

        ////////////////////////////////////////////////////////////////////////////////
        // `initCode` is required to be filled with EntryPoint 0.6.
        ////////////////////////////////////////////////////////////////////////////////

        // If no `initCode` is provided, we use an empty bytes string.
        if (account.entryPoint.version === '0.6' && !request.initCode) request.initCode = '0x'

        ////////////////////////////////////////////////////////////////////////////////
        // If we're using stackup bundler, the stackup paymaster requires gas fees
        ////////////////////////////////////////////////////////////////////////////////
        if (!isUsingAlchemyBundler(bundlerUrl)) {
            const fees = await estimateGasFeesWithReplacement({
                sender: account.address,
                client: rpcClient,
            })
            request = {
                ...request,
                ...fees,
            }
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Fill User Operation with paymaster-related properties for **sending** the User Operation.
        ////////////////////////////////////////////////////////////////////////////////

        if (!request.sender) request.sender = '0xempty'
        if (!request.callGasLimit) request.callGasLimit = 0n
        if (!request.verificationGasLimit) request.verificationGasLimit = 0n
        if (!request.preVerificationGas) request.preVerificationGas = 0n
        if (!request.maxFeePerGas) request.maxFeePerGas = 0n
        if (!request.maxPriorityFeePerGas) request.maxPriorityFeePerGas = 0n
        if (!request.nonce) request.nonce = 0n
        if (!request.signature) request.signature = '0x'
        if (typeof callData !== 'undefined') request.callData = callData
        if (typeof nonce !== 'undefined') request.nonce = nonce

        try {
            const paymasterRespnse = await paymasterProxyMiddleware({
                userOp: request,
                rootKeyAddress,
                bundlerUrl,
                client: rpcClient,
                fetchAccessTokenFn,
                paymasterProxyUrl,
                paymasterProxyAuthSecret,
            })

            if (paymasterRespnse) {
                request = {
                    ...request,
                    ...paymasterRespnse,
                } as PrepareUserOperationRequest
            }
        } catch (error) {
            console.error(error)
        }

        // 0.6 requires paymasterAndData to be provided
        if (!request.paymasterAndData) {
            request.paymasterAndData = '0x'
        }

        ////////////////////////////////////////////////////////////////////////////////
        // If using Alchemy bundler and no gas fees have been set yet, set them
        ////////////////////////////////////////////////////////////////////////////////
        if (
            isUsingAlchemyBundler(bundlerUrl) &&
            !isSponsoredOp({ paymasterAndData: request.paymasterAndData })
        ) {
            const fees = await estimateGasFeesWithReplacement({
                sender: account.address,
                client: rpcClient,
            })
            request = {
                ...request,
                ...fees,
            }
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Fill User Operation with gas-related properties.
        ////////////////////////////////////////////////////////////////////////////////
        const { current } = selectUserOpsByAddress(account.address)
        const { spaceId, functionHashForPaymasterProxy, value } = current

        if (properties.includes('gas')) {
            // If the Account has opinionated gas estimation logic, run the `estimateGas` hook and
            // fill the request with the prepared gas properties.
            if (account.userOperation?.estimateGas) {
                const gas = await account.userOperation.estimateGas(request as UserOperation)
                request = {
                    ...request,
                    ...gas,
                } as PrepareUserOperationRequest
            }

            // If not all the gas properties are already populated, we will need to estimate the gas
            // to fill the gas properties.
            if (
                typeof request.callGasLimit === 'undefined' ||
                request.callGasLimit === 0n ||
                typeof request.preVerificationGas === 'undefined' ||
                request.preVerificationGas === 0n ||
                typeof request.verificationGasLimit === 'undefined' ||
                request.verificationGasLimit === 0n ||
                (request.paymaster && typeof request.paymasterPostOpGasLimit === 'undefined') ||
                (request.paymaster && typeof request.paymasterVerificationGasLimit === 'undefined')
            ) {
                const gas = await estimateGasLimit({
                    userOp: request as UserOperationRequest,
                    account,
                    client: rpcClient,
                    spaceId,
                    functionHashForPaymasterProxy,
                    spaceDapp,
                })
                request = {
                    ...request,
                    callGasLimit: gas.callGasLimit,
                    preVerificationGas: gas.preVerificationGas,
                    verificationGasLimit: gas.verificationGasLimit,
                    paymasterPostOpGasLimit: gas.paymasterPostOpGasLimit,
                    paymasterVerificationGasLimit: gas.paymasterVerificationGasLimit,
                } as PrepareUserOperationRequest
            }
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Save to store so confirm modal can have latest values
        ////////////////////////////////////////////////////////////////////////////////
        userOpsStore.getState().setCurrent({
            sender: account.address,
            op: viemOpDetailsToEthersOpDetails(fallbackRequest(request)),
        })

        ////////////////////////////////////////////////////////////////////////////////
        // Prompt user if the paymaster rejected
        ////////////////////////////////////////////////////////////////////////////////
        const valueBigInt = value ? BigNumber.from(value).toBigInt() : undefined
        if (!isSponsoredOp({ paymasterAndData: request.paymasterAndData })) {
            // tip is a special case
            // - it is not sponsored
            // - it will make tx without prompting user
            // - we only want to prompt user if not enough balance in sender wallet
            if (functionHashForPaymasterProxy === 'tip') {
                const op = request as UserOperation<'0.6'>
                const totalCost = totalCostOfUserOp({
                    gasLimit: op.callGasLimit,
                    preVerificationGas: op.preVerificationGas,
                    verificationGasLimit: op.verificationGasLimit,
                    gasPrice: op.maxFeePerGas,
                    value: valueBigInt,
                })
                const balance = await getAction(
                    rpcClient,
                    getBalance,
                    'getBalance',
                )({
                    address: op.sender,
                })

                if (balance < totalCost) {
                    throw new InsufficientTipBalanceException()
                }
            } else if (functionHashForPaymasterProxy === 'trading') {
                // `trading` is a special case where we don't want to prompt the user
                // because they already know that they need to pay for the operation
                // so we just skip the prompt
                // we have already made sure that the user has enough balance in their wallet
            } else {
                if (request.sender) {
                    await promptUser(request.sender)
                }
            }
        }

        ////////////////////////////////////////////////////////////////////////////////
        // If user is transferring eth, potentially subtract gas from balance being sent
        ////////////////////////////////////////////////////////////////////////////////
        if (valueBigInt && functionHashForPaymasterProxy === 'transferEth') {
            const newCallData = await subtractGasFromBalance({
                op: request,
                client: rpcClient,
                value: valueBigInt,
                functionHash: functionHashForPaymasterProxy,
                smartAccount: account,
            })
            if (newCallData) {
                request.callData = newCallData
            }
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Remove redundant properties that do not conform to the User Operation schema.
        ////////////////////////////////////////////////////////////////////////////////

        delete request.calls
        delete request.parameters
        delete request.paymasterContext
        if (typeof request.paymaster !== 'string') delete request.paymaster

        ////////////////////////////////////////////////////////////////////////////////
        // Save finalized request to store
        ////////////////////////////////////////////////////////////////////////////////
        userOpsStore.getState().setCurrent({
            sender: account.address,
            op: viemOpDetailsToEthersOpDetails(fallbackRequest(request)),
        })
        console.log('[UserOperations] Prepared UserOperation:', request)

        return request as unknown as PrepareUserOperationReturnType<
            account,
            accountOverride,
            calls,
            request
        >
    }

function fallbackRequest(request: UserOperationRequest<'0.6'>): UserOperation<'0.6'> {
    return {
        ...request,
        sender: request.sender ?? '0xempty',
        callData: request.callData ?? '0x',
        callGasLimit: request.callGasLimit ?? 0n,
        verificationGasLimit: request.verificationGasLimit ?? 0n,
        preVerificationGas: request.preVerificationGas ?? 0n,
        maxFeePerGas: request.maxFeePerGas ?? 0n,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas ?? 0n,
        nonce: request.nonce ?? 0n,
        signature: request.signature ?? '0x',
    }
}
