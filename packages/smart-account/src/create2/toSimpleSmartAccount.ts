import type { Address, Hex, LocalAccount, PublicClient } from 'viem'
import { encodeFunctionData, decodeFunctionData } from 'viem'
import {
    type SmartAccount,
    type SmartAccountImplementation,
    type UserOperation,
    entryPoint06Abi,
    entryPoint06Address,
    getUserOperationHash,
    toSmartAccount,
} from 'viem/account-abstraction'
import { readContract } from 'viem/actions'
import { getAction } from 'viem/utils'
import { SIMPLE_ACCOUNT_FACTORY } from '../constants'
import { simpleAccountAbi } from '../abis/simpleAccountAbi'
import { simpleFactoryAbi } from '../abis/simpleFactoryAbi'

const ENTRYPOINT_VERSION = '0.6' as const

export type SimpleSmartAccountImplementation = SmartAccountImplementation<
    typeof entryPoint06Abi,
    typeof ENTRYPOINT_VERSION
>

export type ToSimpleSmartAccountReturnType = SmartAccount<SimpleSmartAccountImplementation>

/**
 * Encodes the factory init code for creating a SimpleAccount
 */
function getAccountInitCode(owner: Address, index: bigint = 0n): Hex {
    return encodeFunctionData({
        abi: simpleFactoryAbi,
        functionName: 'createAccount',
        args: [owner, index],
    })
}

/**
 * Gets the nonce for the account from the EntryPoint
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
 * Creates a Simple Smart Account (EntryPoint v0.6)
 *
 * @param config - Configuration for the simple smart account
 * @returns A viem SmartAccount instance
 */
export async function toSimpleSmartAccount(params: {
    client: PublicClient
    owner: LocalAccount
    address: Address
}): Promise<ToSimpleSmartAccountReturnType> {
    const { client, owner, address: accountAddress } = params

    const entryPoint = {
        address: entryPoint06Address,
        abi: entryPoint06Abi,
        version: ENTRYPOINT_VERSION,
    } as const

    const getFactoryArgs = async () => {
        return {
            factory: SIMPLE_ACCOUNT_FACTORY,
            factoryData: getAccountInitCode(owner.address, 0n),
        }
    }

    return toSmartAccount({
        client,
        entryPoint,
        getFactoryArgs,

        async getAddress() {
            return accountAddress
        },

        async encodeCalls(calls) {
            if (calls.length === 1) {
                const call = calls[0]
                return encodeFunctionData({
                    abi: simpleAccountAbi,
                    functionName: 'execute',
                    args: [call.to, call.value ?? 0n, call.data ?? '0x'],
                })
            }

            // executeBatch for v0.6 SimpleAccount uses (address[], bytes[]) signature
            return encodeFunctionData({
                abi: simpleAccountAbi,
                functionName: 'executeBatch',
                args: [calls.map((call) => call.to), calls.map((call) => call.data ?? '0x')],
            })
        },

        async decodeCalls(callData) {
            try {
                const decoded = decodeFunctionData({
                    abi: simpleAccountAbi,
                    data: callData,
                })

                if (decoded.functionName === 'execute') {
                    return [
                        {
                            to: decoded.args[0] as Address,
                            value: decoded.args[1] as bigint,
                            data: decoded.args[2] as Hex,
                        },
                    ]
                } else if (decoded.functionName === 'executeBatch') {
                    const addresses = decoded.args[0] as Address[]
                    const datas = decoded.args[1] as Hex[]
                    return addresses.map((to, i) => ({
                        to,
                        value: 0n,
                        data: datas[i],
                    }))
                }

                throw new Error('Invalid function name')
            } catch {
                throw new Error('Invalid call data')
            }
        },

        async getNonce(args) {
            const key = args?.key ?? 0n
            return getAccountNonce(client, accountAddress, entryPoint.address, key)
        },

        async getStubSignature() {
            // Standard 65-byte dummy signature for gas estimation
            return '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
        },

        async sign({ hash }) {
            return owner.signMessage({ message: { raw: hash } })
        },

        async signMessage({ message }) {
            return owner.signMessage({ message })
        },

        async signTypedData(typedData) {
            return owner.signTypedData(typedData)
        },

        async signUserOperation(parameters) {
            const chainId = parameters.chainId ?? client.chain?.id
            if (!chainId) {
                throw new Error('Chain ID is required for signing user operations')
            }

            const hash = getUserOperationHash({
                userOperation: {
                    ...parameters,
                    signature: '0x',
                } as UserOperation<'0.6'>,
                entryPointAddress: entryPoint.address,
                entryPointVersion: entryPoint.version,
                chainId,
            })

            return owner.signMessage({ message: { raw: hash } })
        },
    })
}
