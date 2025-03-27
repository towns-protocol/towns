import {
    createSmartAccountClient as permissionlessCreateSmartAccountClient,
    SmartAccountClient,
} from 'permissionless'
import { http, Hex, Address, PublicClient } from 'viem'
import { prepareUserOperation } from '../prepareUserOperation'
import { getBlock } from 'viem/actions'
import {
    getUserOperationReceipt,
    isEthGetUserOperationReceiptResponse,
} from '../../getUserOperationReceipt'
import { datadogLogs } from '@datadog/browser-logs'
import { userOperationEventAbi } from '../../userOperationEvent'
import { SpaceDapp } from '@towns-protocol/web3'
import { SendUserOperationReturnType } from '../../types'
import { SmartAccount as ViemSmartAccount } from 'viem/account-abstraction'
import { SmartAccountType } from '../../../types'
import { LocalAccount } from 'viem'
import { ERC4337 } from '../../../constants'

export type TownsSmartAccountImplementation = ViemSmartAccount & {
    encodeExecute: (args: { to: Address; value: bigint; data: Hex }) => Promise<Hex>
    encodeExecuteBatch: (args: { to: Address[]; value: bigint[]; data: Hex[] }) => Promise<Hex>
}

export type CreateSmartAccountClientArgs = {
    owner: LocalAccount
    rpcUrl: string
    bundlerUrl: string
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
    spaceDapp: SpaceDapp | undefined
    fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    publicRpcClient: PublicClient
    smartAccountImpl: TownsSmartAccountImplementation
    entrypointAddress: Address
    factoryAddress: Address
}

export type TSmartAccount = {
    address: Address
    client: SmartAccountClient
    publicRpcClient: PublicClient
    factoryAddress: Address
    entrypointAddress: Address
    type: SmartAccountType
    sendUserOperation: (args: { callData: Hex }) => Promise<SendUserOperationReturnType>
    setWaitTimeoutMs: (timeoutMs: number) => void
    setWaitIntervalMs: (intervalMs: number) => void
    encodeExecute: TownsSmartAccountImplementation['encodeExecute']
    encodeExecuteBatch: TownsSmartAccountImplementation['encodeExecuteBatch']
}

export async function createSmartAccountClient(
    args: CreateSmartAccountClientArgs,
): Promise<TSmartAccount> {
    const {
        owner,
        bundlerUrl,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
        spaceDapp,
        entrypointAddress,
        publicRpcClient,
        factoryAddress,
        smartAccountImpl,
        fetchAccessTokenFn,
    } = args

    const smartAccountClient = permissionlessCreateSmartAccountClient({
        account: smartAccountImpl,
        client: publicRpcClient,
        bundlerTransport: http(bundlerUrl),
        userOperation: {
            prepareUserOperation: prepareUserOperation({
                bundlerUrl,
                paymasterProxyUrl,
                paymasterProxyAuthSecret,
                spaceDapp,
                fetchAccessTokenFn,
                rootKeyAddress: owner.address,
            }),
        },
    })

    let waitTimeoutMs = 30_000
    let waitIntervalMs = 500

    async function poll<T>(args: {
        action: () => Promise<T | null>
        timeoutMs?: number
        intervalMs?: number
    }): Promise<{ duration: number; result: T | null } | null> {
        const { action, timeoutMs = waitTimeoutMs, intervalMs = waitIntervalMs } = args

        const start = Date.now()
        const end = Date.now() + timeoutMs
        while (Date.now() < end) {
            const result = await action()
            if (result) {
                return { duration: Date.now() - start, result }
            }
            await new Promise((resolve) => setTimeout(resolve, intervalMs))
        }

        return { duration: Date.now() - start, result: null }
    }

    return {
        address: await smartAccountImpl.getAddress(),
        client: smartAccountClient,
        type: factoryAddress === ERC4337.SimpleAccount.Factory ? 'simple' : 'modular',
        factoryAddress,
        entrypointAddress,
        publicRpcClient: publicRpcClient,
        sendUserOperation: async (args: {
            callData: Hex
        }): Promise<SendUserOperationReturnType> => {
            const { callData } = args

            const userOpHash = await smartAccountClient.sendUserOperation({
                callData,
            })

            const response = {
                userOpHash,
                wait: async () => {
                    const block = await getBlock(publicRpcClient)

                    const polledAction = await poll({
                        action: async () => {
                            const logs = await publicRpcClient.getLogs({
                                address: entrypointAddress,
                                event: userOperationEventAbi,
                                args: {
                                    userOpHash,
                                },
                                fromBlock: block.number > 100n ? block.number - 100n : 0n,
                                toBlock: 'latest',
                            })
                            return logs.length > 0 ? logs[0] : null
                        },
                    })
                    return polledAction?.result ?? null
                },
                getUserOperationReceipt: async () => {
                    const polledAction = await poll({
                        action: async () => {
                            try {
                                const receipt = await getUserOperationReceipt({
                                    bundlerClient: smartAccountClient,
                                    userOpHash,
                                })

                                if (isEthGetUserOperationReceiptResponse(receipt)) {
                                    return receipt
                                }
                                return receipt
                            } catch (error) {
                                console.error(
                                    '[TownsUserOpClient] Failed to get user operation receipt:',
                                    error,
                                )
                                return null
                            }
                        },
                    })

                    const GET_USER_OPERATION_RECEIPT = 'get_user_operation_receipt'

                    if (polledAction?.result) {
                        datadogLogs.logger.info(GET_USER_OPERATION_RECEIPT, {
                            userOpHash,
                            transactionHash: polledAction.result.receipt?.transactionHash,
                            duration: polledAction.duration,
                            success: true,
                        })
                    } else {
                        datadogLogs.logger.info(GET_USER_OPERATION_RECEIPT, {
                            userOpHash,
                            transactionHash: null,
                            duration: polledAction?.duration,
                            success: false,
                        })
                    }
                    return polledAction?.result ?? null
                },
            }

            return response
        },
        setWaitTimeoutMs: (timeoutMs: number) => {
            waitTimeoutMs = timeoutMs
        },
        setWaitIntervalMs: (intervalMs: number) => {
            waitIntervalMs = intervalMs
        },
        encodeExecute: async (args: { to: Address; value: bigint; data: Hex }) =>
            smartAccountImpl.encodeExecute(args),
        encodeExecuteBatch: async (args: { to: Address[]; value: bigint[]; data: Hex[] }) =>
            smartAccountImpl.encodeExecuteBatch(args),
    }
}
