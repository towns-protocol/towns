import type { Address, Hex, LocalAccount, PublicClient } from 'viem'
import {
    encodeFunctionData,
    decodeFunctionData,
    getContract,
    concatHex,
    zeroAddress,
    maxUint32,
    toHex,
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
import { getChainId, getCode, readContract } from 'viem/actions'
import { getAction } from 'viem/utils'
import { MODULAR_ACCOUNT_FACTORY } from '../constants'
import { modularAccountAbi } from '../abis/modularAccountAbi'
import { modularFactoryAbi } from '../abis/modularFactoryAbi'
import { nativeSMASigner, DEFAULT_OWNER_ENTITY_ID } from './nativeSMASigner'

export type ModularAccountVersion = '2.0.0'
const ENTRYPOINT_VERSION = '0.7' as const

// Selector for executeUserOp function
const executeUserOpSelector: Hex = '0x8DD7712F'

export type ValidationDataParams =
    | { validationModuleAddress: Address; entityId?: never }
    | { validationModuleAddress?: never; entityId: number }

export type ModularSmartAccountImplementation = SmartAccountImplementation<
    typeof entryPoint07Abi,
    typeof ENTRYPOINT_VERSION
> & {
    // /** aa-sdk */
    encodeCallData: (callData: Hex) => Promise<Hex>
    // /** aa-sdk */
    getValidationData: (args: ValidationDataParams) => Promise<{
        validationFlags: number
        validationHooks: readonly Hex[]
        executionHooks: readonly Hex[]
        selectors: readonly Hex[]
    }>
    /** aa-sdk */
    isAccountDeployed: () => Promise<boolean>
}

export type ToModularSmartAccountReturnType = SmartAccount<ModularSmartAccountImplementation>

const getAccountInitCode = async (owner: Address, index = BigInt(0)): Promise<Hex> => {
    if (!owner) throw new Error('Owner account not found')

    return encodeFunctionData({
        abi: modularFactoryAbi,
        functionName: 'createSemiModularAccount',
        args: [owner, index],
    })
}

/**
 * Decodes callData by removing the executeUserOpSelector prefix if present
 */
function modularDecodeCallData(callData: Hex): Hex {
    if (callData.toLowerCase().startsWith(executeUserOpSelector.toLowerCase())) {
        return `0x${callData.slice(executeUserOpSelector.length)}`
    }
    return callData
}

/**
 * Serializes a module entity (address + entityId) into hex
 */
function serializeModuleEntity(moduleAddress: Address, entityId: number): Hex {
    return concatHex([moduleAddress, toHex(entityId, { size: 4 })])
}

/**
 * Gets the nonce for the account from the EntryPoint (v0.7 style with key encoding)
 */
async function getAccountNonce(
    client: PublicClient,
    address: Address,
    entryPointAddress: Address,
    key: bigint = 0n,
): Promise<bigint> {
    return getAction(
        client,
        readContract,
        'readContract',
    )({
        address: entryPointAddress,
        abi: [
            {
                inputs: [
                    { name: 'sender', type: 'address' },
                    { name: 'key', type: 'uint192' },
                ],
                name: 'getNonce',
                outputs: [{ name: 'nonce', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function',
            },
        ],
        functionName: 'getNonce',
        args: [address, key],
    })
}

/**
 * @description Creates a Modular Smart Account from a private key.
 *
 * @returns A Private Key Modular Account.
 */
export async function toModularSmartAccount(params: {
    client: PublicClient
    owner: LocalAccount
    address: Address
}): Promise<ToModularSmartAccountReturnType> {
    const {
        // version,
        // factoryAddress: _factoryAddress,
        address: accountAddress,
        owner: localOwner,
        client,
        // index = BigInt(0),
        // nonceKey,
    } = params

    const entryPoint = {
        address: entryPoint07Address,
        abi: entryPoint07Abi,
        version: ENTRYPOINT_VERSION,
    } as const

    let chainId: number

    const getMemoizedChainId = async () => {
        if (chainId) return chainId
        chainId = client.chain
            ? client.chain.id
            : await getAction(client, getChainId, 'getChainId')({})
        return chainId
    }

    const getFactoryArgs = async () => {
        return {
            factory: MODULAR_ACCOUNT_FACTORY,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        client: client as any,
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
            return getAccountNonce(client, accountAddress, entryPoint.address, fullNonceKey)
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
                serializeModuleEntity(
                    validationModuleAddress ?? zeroAddress,
                    entityId ?? Number(maxUint32),
                ),
            ])
        },
        async getStubSignature() {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                accountAddress,
            ).getDummySignature()
        },
        async sign({ hash }) {
            return this.signMessage({ message: hash })
        },
        async signMessage({ message }) {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                accountAddress,
            ).signMessage({ message })
        },
        async signTypedData(typedData) {
            return nativeSMASigner(
                localOwner,
                await getMemoizedChainId(),
                accountAddress,
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
                accountAddress,
            ).signUserOperationHash(hash)
        },
    }) as Promise<ToModularSmartAccountReturnType>
}
