import {
    type Account,
    type Address,
    type Assign,
    type Chain,
    type Client,
    type Hex,
    type LocalAccount,
    type OneOf,
    type Transport,
    type WalletClient,
    concatHex,
    decodeFunctionData,
    encodeFunctionData,
    getContract,
    maxUint32,
    zeroAddress,
} from 'viem'
import {
    type SmartAccount,
    type SmartAccountImplementation,
    type UserOperation,
    entryPoint07Abi,
    entryPoint07Address,
    getUserOperationHash,
    toSmartAccount,
} from 'viem/account-abstraction'
import { getChainId, getCode } from 'viem/actions'
import { getAction } from 'viem/utils'
import { getAccountNonce } from '../helpers/getAccountNonce'
import { EthereumProvider, toOwner } from '../helpers/toOwner'
import {
    DEFAULT_OWNER_ENTITY_ID,
    executeUserOpSelector,
    getDefaultMAV2FactoryAddress,
    modularDecodeCallData,
    serializeModuleEntity,
} from './utils'
import { nativeSMASigner } from './nativeSMASigner'
import { accountFactoryAbi } from './abis/accountFactoryAbi'
import { modularAccountAbi } from './abis/modularAccountAbi'

const getAccountInitCode = async (owner: Address, index = BigInt(0)): Promise<Hex> => {
    if (!owner) throw new Error('Owner account not found')

    return encodeFunctionData({
        abi: accountFactoryAbi,
        functionName: 'createSemiModularAccount',
        args: [owner, index],
    })
}

export type ModularAccountVersion = '2.0.0'
const ENTRYPOINT_VERSION = '0.7'

export type ToModularSmartAccountParameters = {
    client: Client
    // entryPoint?: {
    //     address: Address
    //     version: typeof ENTRYPOINT_VERSION
    // }
    owner: OneOf<
        EthereumProvider | WalletClient<Transport, Chain | undefined, Account> | LocalAccount
    >
    // version: ModularAccountVersion
    // factoryAddress?: Address
    // index?: bigint
    address: Address
    // nonceKey?: bigint
}

export type ModularSmartAccountImplementation = Assign<
    SmartAccountImplementation<typeof entryPoint07Abi, typeof ENTRYPOINT_VERSION>,
    { sign: NonNullable<SmartAccountImplementation['sign']> } & {
        encodeExecute: (args: { to: Address; value: bigint; data: Hex }) => Promise<Hex>
        encodeExecuteBatch: (args: { to: Address[]; value: bigint[]; data: Hex[] }) => Promise<Hex>
        // /** aa-sdk */
        encodeCallData: (callData: Hex) => Promise<Hex>
        // /** aa-sdk */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getValidationData: (args: ValidationDataParams) => Promise<{
            validationFlags: number
            validationHooks: readonly `0x${string}`[]
            executionHooks: readonly `0x${string}`[]
            selectors: readonly `0x${string}`[]
        }>
        /** aa-sdk */
        isAccountDeployed: () => Promise<boolean>
    }
>

export type ToModularSmartAccountReturnType = SmartAccount<ModularSmartAccountImplementation>

export type ValidationDataParams =
    | {
          validationModuleAddress: Address
          entityId?: never
      }
    | {
          validationModuleAddress?: never
          entityId: number
      }

/**
 * @description Creates an Modular Account from a private key.
 *
 * @returns A Private Key Modular Account.
 */
export async function toModularSmartAccount(
    parameters: ToModularSmartAccountParameters,
): Promise<ToModularSmartAccountReturnType> {
    const {
        // version,
        // factoryAddress: _factoryAddress,
        address,
        owner,
        client,
        // index = BigInt(0),
        // nonceKey,
    } = parameters

    const localOwner = await toOwner({ owner })

    const entryPoint = {
        address: entryPoint07Address,
        abi: entryPoint07Abi,
        version: ENTRYPOINT_VERSION,
    } as const

    const accountAddress: Address = address

    let chainId: number

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, 'getChainId')({})
        return chainId
    }
    const factoryAddress = getDefaultMAV2FactoryAddress(await getMemoizedChainId())

    const getFactoryArgs = async () => {
        return {
            factory: factoryAddress,
            // original SALT for simple accounts = 0n, so keeping it consistent here
            factoryData: await getAccountInitCode(localOwner.address, 0n),
        }
    }

    const accountContract = getContract({
        address: accountAddress,
        abi: modularAccountAbi,
        client,
    })

    return toSmartAccount<ModularSmartAccountImplementation>({
        client,
        entryPoint,
        getFactoryArgs,
        async getAddress() {
            return accountAddress

            // 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨
            // (╯°□°）╯︵ ┻━┻
            //
            // with local geth + permissionless, certain wallets w/ private keys like this one will cause smart account failure
            // Geth throws this error: `invalid code: must not begin with 0xef`
            // const PRIVATE_KEY = '0x1ffeb42d5991715177ec8bf1f06aef3a62e558d3dc6a686cc9fe23a8ab652bb2'
            //
            // The root of the problem is the getSenderAddress fn, which makes an eth_call where some smart account deployment code starts with `0xef`
            // and geth (at least the local one) does not allow that b/c it's part of EOF (ethereum object format), and EOF is not being included until pectra upgrade
            //
            // This error also throws on vanilla permissionless.js in a separate repo!
            //
            //  Get the sender address based on the init code
            // accountAddress = await getSenderAddress(client, {
            //     factory,
            //     factoryData,
            //     entryPointAddress: entryPoint.address,
            // })
            //
            //
            //
            // This problem might only effect local geth dev - but I'm not gonna take chances here
            // so I'm using the getInitData fn, which does the same thing, and has never posed problems
            // const { addr } = await getInitData({
            //     type: 'modular',
            //     signerAddress: localOwner.address,
            //     rpcUrl,
            // })
            // accountAddress = addr

            // return accountAddress
        },
        /**
         * from aa-sdk
         * @param callData
         * @returns
         */
        async encodeCallData(callData: Hex): Promise<Hex> {
            const validationData = await this.getValidationData({
                entityId: Number(0),
            })

            return validationData.executionHooks.length
                ? concatHex([executeUserOpSelector, callData])
                : callData
        },
        async encodeCalls(calls) {
            if (calls.length > 1) {
                return this.encodeCallData(
                    encodeFunctionData({
                        abi: modularAccountAbi,
                        functionName: 'executeBatch',
                        args: [
                            calls.map((a) => ({
                                target: a.to,
                                value: a.value ?? 0n,
                                data: a.data ?? '0x',
                            })),
                        ],
                    }),
                )
            }

            const call = calls.length === 0 ? undefined : calls[0]

            if (!call) {
                throw new Error('No calls to encode')
            }

            const data = await this.encodeCallData(
                encodeFunctionData({
                    abi: modularAccountAbi,
                    functionName: 'execute',
                    args: [call.to, call.value ?? 0n, call.data ?? '0x'],
                }),
            )

            return data
        },
        async encodeExecute(args: { to: Address; value: bigint; data: Hex }) {
            return this.encodeCallData(
                encodeFunctionData({
                    abi: modularAccountAbi,
                    functionName: 'execute',
                    args: [args.to, args.value ?? 0n, args.data ?? '0x'],
                }),
            )
        },
        async encodeExecuteBatch(args: { to: Address[]; value: bigint[]; data: Hex[] }) {
            return this.encodeCallData(
                encodeFunctionData({
                    abi: modularAccountAbi,
                    functionName: 'executeBatch',
                    args: [
                        args.to.map((to, i) => ({
                            target: to,
                            value: args.value[i] ?? 0n,
                            data: args.data[i] ?? '0x',
                        })),
                    ],
                }),
            )
        },

        async decodeCalls(callData) {
            try {
                const decoded = decodeFunctionData({
                    abi: modularAccountAbi,
                    data: modularDecodeCallData(callData),
                })

                if (decoded.functionName === 'executeBatch') {
                    const calls: {
                        to: Address
                        value: bigint
                        data: Hex
                    }[] = []

                    for (let i = 0; i < decoded.args[0].length; i++) {
                        calls.push({
                            to: decoded.args[0][i].target,
                            value: decoded.args[0][i].value,
                            data: decoded.args[0][i].data,
                        })
                    }

                    return calls
                } else if (decoded.functionName === 'execute') {
                    return [
                        {
                            to: decoded.args[0],
                            value: decoded.args[1],
                            data: decoded.args[2],
                        },
                    ]
                }

                throw new Error('Invalid function name')
            } catch (_) {
                throw new Error('Invalid call data')
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async getNonce(_args) {
            const isGlobalValidation = true
            // viem passes in a nonce key if we don't set it toModularSmartAccount, and it causes ops to fail
            // setting 0n here is the same as aa-sdk
            const nonceKey = 0n

            // this is how aa-sdk gets nonce for modular account
            // globalValidation ? it defaults to true in the sdk so i'm setting it here
            const fullNonceKey: bigint =
                (nonceKey << 40n) +
                (BigInt(DEFAULT_OWNER_ENTITY_ID) << 8n) +
                (isGlobalValidation ? 1n : 0n)

            // first op, this results in nonce like 0x0000001
            return getAccountNonce(client, {
                address: await this.getAddress(),
                entryPointAddress: entryPoint.address,
                key: fullNonceKey,
            })
        },
        /**
         * from aa-sdk
         */
        async isAccountDeployed() {
            return !!(await getAction(client, getCode, 'getCode')({ address: accountAddress }))
        },
        /**
         * from aa-sdk
         */
        async getValidationData(args: ValidationDataParams) {
            if (!(await this.isAccountDeployed())) {
                return {
                    validationHooks: [],
                    executionHooks: [],
                    selectors: [],
                    validationFlags: 0,
                }
            }

            const { validationModuleAddress, entityId } = args
            return await accountContract.read.getValidationData([
                serializeModuleEntity({
                    moduleAddress: validationModuleAddress ?? zeroAddress,
                    entityId: entityId ?? Number(maxUint32),
                }),
            ])
        },
        async getStubSignature() {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                await this.getAddress(),
            ).getDummySignature()
        },
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        async signMessage({ message }) {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                await this.getAddress(),
            ).signMessage({ message })
        },
        async signTypedData(typedData) {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                await this.getAddress(),
            ).signTypedData(typedData)
        },
        async signUserOperation(parameters) {
            const { chainId = await getMemoizedChainId(), ...userOperation } = parameters

            const hash = getUserOperationHash({
                userOperation: {
                    ...userOperation,
                    signature: '0x',
                } as UserOperation<'0.7'>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId: chainId,
            })
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                await this.getAddress(),
            ).signUserOperationHash(hash)
        },
    }) as Promise<ToModularSmartAccountReturnType>
}
