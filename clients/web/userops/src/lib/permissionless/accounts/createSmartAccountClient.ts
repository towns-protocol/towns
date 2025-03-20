import {
    createSmartAccountClient as permissionlessCreateSmartAccountClient,
    SmartAccountClient,
} from 'permissionless'
import { http, Hex, Address, createPublicClient, PublicClient } from 'viem'
import { ethers } from 'ethers'
import { prepareUserOperation } from '../prepareUserOperation'
import { getBlock } from 'viem/actions'
import {
    getUserOperationReceipt,
    isEthGetUserOperationReceiptResponse,
} from '../../getUserOperationReceipt'
import { datadogLogs } from '@datadog/browser-logs'
import { userOperationEventAbi } from '../../userOperationEvent'
import { getChain } from '../utils/getChain'
import { ISpaceDapp } from '@towns-protocol/web3'
import { SendUserOperationReturnType } from '../../types'
import { SmartAccount as ViemSmartAccount } from 'viem/account-abstraction'

export type CreateSmartAccountClientArgs<entryPointVersion extends '0.6' | '0.7'> = {
    signer: ethers.Signer
    rpcUrl: string
    bundlerUrl: string
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
    spaceDapp: ISpaceDapp | undefined
    fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    smartAccountImpl: (args: { publicClient: PublicClient }) => Promise<ViemSmartAccount>
    entrypointAddress: Address
    entrypointVersion: entryPointVersion
    factoryAddress: Address
    type: 'simple' | 'light'
    nonceKey?: bigint
}

export type TSmartAccount = {
    address: Address
    type: 'simple' | 'light'
    client: SmartAccountClient
    publicRpcClient: PublicClient
    factoryAddress: Address
    entrypointAddress: Address
    sendUserOperation: (args: { callData: Hex }) => Promise<SendUserOperationReturnType>
    setWaitTimeoutMs: (timeoutMs: number) => void
    setWaitIntervalMs: (intervalMs: number) => void
}

export async function createSmartAccountClient<entryPointVersion extends '0.6' | '0.7'>(
    args: CreateSmartAccountClientArgs<entryPointVersion>,
): Promise<TSmartAccount> {
    const {
        signer,
        rpcUrl,
        bundlerUrl,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
        spaceDapp,
        entrypointAddress,
        type,
        factoryAddress,
        smartAccountImpl,
        fetchAccessTokenFn,
    } = args

    const chain = await getChain(signer)

    const publicRpcClient = createPublicClient({
        transport: http(rpcUrl),
        chain,
    }) as PublicClient

    const smartAccountClient = permissionlessCreateSmartAccountClient({
        account: await smartAccountImpl({ publicClient: publicRpcClient }),
        client: publicRpcClient,
        bundlerTransport: http(bundlerUrl),
        userOperation: {
            prepareUserOperation: prepareUserOperation({
                bundlerUrl,
                paymasterProxyUrl,
                paymasterProxyAuthSecret,
                spaceDapp,
                fetchAccessTokenFn,
                rootKeyAddress: await signer.getAddress(),
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
        address: smartAccountClient.account.address,
        client: smartAccountClient,
        type,
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
    }
}
