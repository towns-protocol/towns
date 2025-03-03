import { BigNumberish, ethers } from 'ethers'
import {
    BundlerJsonRpcProvider,
    IClientOpts,
    ISendUserOperationOpts,
    StateOverrideSet,
    UserOperationBuilder,
    UserOperationMiddlewareCtx,
} from 'userop'
import { EntryPoint, EntryPoint__factory } from 'userop/dist/typechain'
import { ERC4337 } from '../../constants'
import { OpToJSON } from '../../utils/opToJson'
import { datadogLogs } from '@datadog/browser-logs'
import {
    getUserOperationReceipt,
    isEthGetUserOperationReceiptResponse,
} from '../getUserOperationReceipt'
import { EthGetUserOperationReceiptResponse, SendUserOperationReturnType } from '../types'
import { UserOperationEvent } from '../userOperationEvent'
import { Address, Hex } from 'viem'

export class TownsUserOpClient {
    private provider: BundlerJsonRpcProvider

    public entryPoint: EntryPoint
    public chainId: BigNumberish
    public waitTimeoutMs: number
    public waitIntervalMs: number

    private constructor(provider: BundlerJsonRpcProvider, opts?: IClientOpts) {
        this.provider = provider
        this.entryPoint = EntryPoint__factory.connect(
            opts?.entryPoint || ERC4337.EntryPoint,
            this.provider,
        )
        this.chainId = ethers.BigNumber.from(1)
        this.waitTimeoutMs = 30_000
        this.waitIntervalMs = 500
    }

    public setWaitTimeoutMs(ms: number) {
        this.waitTimeoutMs = ms
    }

    public setWaitIntervalMs(ms: number) {
        this.waitIntervalMs = ms
    }

    public static createProvider(rpcUrl: string, opts?: IClientOpts) {
        return new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(opts?.overrideBundlerRpc)
    }

    public static async init(rpcUrl: string, opts?: IClientOpts) {
        const instance = new TownsUserOpClient(this.createProvider(rpcUrl, opts), opts)
        instance.chainId = await instance.provider
            .getNetwork()
            .then((network) => ethers.BigNumber.from(network.chainId))

        return instance
    }

    async buildUserOperation(builder: UserOperationBuilder, stateOverrides?: StateOverrideSet) {
        return builder.buildOp(this.entryPoint.address, this.chainId, stateOverrides)
    }

    private async poll<T>(args: {
        action: () => Promise<T | null>
        dryRun?: boolean
    }): Promise<{ duration: number; result: T | null } | null> {
        const { action, dryRun } = args
        if (dryRun) {
            return null
        }

        const start = Date.now()
        const end = Date.now() + this.waitTimeoutMs
        while (Date.now() < end) {
            const result = await action()
            if (result) {
                return { duration: Date.now() - start, result }
            }
            await new Promise((resolve) => setTimeout(resolve, this.waitIntervalMs))
        }

        return { duration: Date.now() - start, result: null }
    }

    async sendUserOperation(
        builder: UserOperationBuilder,
        opts?: ISendUserOperationOpts,
    ): Promise<SendUserOperationReturnType> {
        const dryRun = Boolean(opts?.dryRun)
        const op = await this.buildUserOperation(builder, opts?.stateOverrides)
        opts?.onBuild?.(op)

        const userOpHash = dryRun
            ? new UserOperationMiddlewareCtx(
                  op,
                  this.entryPoint.address,
                  this.chainId,
              ).getUserOpHash()
            : ((await this.provider.send('eth_sendUserOperation', [
                  OpToJSON(op),
                  this.entryPoint.address,
              ])) as string)

        builder.resetOp()

        const response = {
            userOpHash,
            // original wait function from userop.js
            wait: async (): Promise<UserOperationEvent | null> => {
                const block = await this.provider.getBlock('latest')
                const polledAction = await this.poll<UserOperationEvent>({
                    action: async () => {
                        const events = await this.entryPoint.queryFilter(
                            this.entryPoint.filters.UserOperationEvent(userOpHash),
                            Math.max(0, block.number - 100),
                        )
                        if (events.length > 0) {
                            const ev = events[0]
                            return {
                                address: ev.address as Address,
                                blockHash: ev.blockHash as Hex,
                                blockNumber: BigInt(ev.blockNumber),
                                data: ev.data as Hex,
                                transactionHash: ev.transactionHash as Address,
                                transactionIndex: ev.transactionIndex,
                                eventName: 'UserOperationEvent',
                                userOpHash: ev.args.userOpHash as Hex,
                                logIndex: ev.logIndex,
                                removed: ev.removed,
                                args: {
                                    userOpHash: ev.args.userOpHash as Hex,
                                    sender: ev.args.sender as Address,
                                    paymaster: ev.args.paymaster as Address,
                                    nonce: ev.args.nonce.toBigInt(),
                                    success: ev.args.success as boolean,
                                },
                                topics: ev.topics as [Hex, Hex, Hex, Hex],
                            }
                        }
                        return null
                    },
                })
                return polledAction?.result ?? null
            },
            getUserOperationReceipt:
                async (): Promise<EthGetUserOperationReceiptResponse | null> => {
                    const polledAction = await this.poll<EthGetUserOperationReceiptResponse>({
                        action: async () => {
                            try {
                                const receipt = await getUserOperationReceipt({
                                    provider: this.provider,
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
    }
}
