import {
    Address,
    BaseError,
    concatHex,
    ContractFunctionRevertedError,
    createPublicClient,
    encodeFunctionData,
    getContract,
    GetContractReturnType,
    http,
    PublicClient,
    zeroAddress,
} from 'viem'
import { entryPoint07Abi, entryPoint07Address } from 'viem/account-abstraction'
import { entryPoint06Abi } from 'viem/account-abstraction'
import { entryPoint06Address } from 'viem/account-abstraction'
import { providerMap } from './provider'
import { Environment } from 'worker-common'
import { Env } from './types'

type SmartAccountType = 'simple' | 'modular'

export const ERC4337 = {
    SimpleAccount: {
        Factory: '0x9406Cc6185a346906296840746125a0E44976454',
        Implementation: '0x8ABB13360b87Be5EEb1B98647A016adD927a136c',
    },
    ModularAccount: {
        Factory: '0x00000000000017c61b5bEe81050EC8eFc9c6fecd',
        // Semi modular smart account bytecode for new accounts
        // new accounts get this address as their implementation
        Implementation: '0x000000000000c5A9089039570Dd36455b5C07383',
        // https://github.com/alchemyplatform/modular-account/blob/develop/src/account/SemiModularAccountStorageOnly.sol
        // Storage only smart account bytecode for existing accounts
        // Upgraded accounts get this address as their implementation
        StorageOnly: '0x0000000000006E2f9d80CaEc0Da6500f005EB25A',
    },
} as const

let rpcClient: PublicClient
let entryPointContractV06: GetContractReturnType<
    typeof entryPoint06Abi,
    typeof rpcClient,
    typeof entryPoint06Address
>
let entryPointContractV07: GetContractReturnType<
    typeof entryPoint07Abi,
    typeof rpcClient,
    typeof entryPoint07Address
>

export async function determineSmartAccount(args: {
    newAccountImplementationType: SmartAccountType
    ownerAddress: Address
    environment: Environment
    env: Env
}): Promise<{
    address: Address
    accountType: SmartAccountType
}> {
    const { newAccountImplementationType, ownerAddress, environment, env } = args
    let providerUrl = providerMap.get(environment)
    if (environment !== 'development') {
        providerUrl = `${providerUrl}${env.ALCHEMY_API_KEY}`
    }

    if (!rpcClient) {
        rpcClient = createPublicClient({
            transport: http(providerUrl),
        })
    }

    const simpleInitCode = simpleAccountInitCode(ownerAddress, 0n)
    const modularInitCode = modularAccountInitCode(ownerAddress, 0n)
    const [getSimpleRpcCall, getModularRpcCall] = await Promise.allSettled([
        getEntryPoint06().simulate.getSenderAddress([simpleInitCode]),
        getEntryPoint07().simulate.getSenderAddress([modularInitCode]),
    ])

    let senderAddressSimpleAccount: Address | undefined
    let senderAddressModularAccount: Address | undefined

    if (getSimpleRpcCall.status === 'rejected' && getModularRpcCall.status === 'rejected') {
        const errors = [getSimpleRpcCall.reason, getModularRpcCall.reason]
        if (errors.every((error) => error instanceof BaseError)) {
            ;[senderAddressSimpleAccount, senderAddressModularAccount] =
                errors.map(extractAddressFromError)
        }
    }

    if (!senderAddressSimpleAccount || !senderAddressModularAccount) {
        throw new Error('Failed to get sender address')
    }

    // not upgrading yet, we can just return the simple account address
    if (newAccountImplementationType === 'simple') {
        return {
            address: senderAddressSimpleAccount,
            accountType: 'simple',
        }
    }

    let implementationDetails:
        | {
              implementationAddress: Address
              accountAddress: Address
          }
        | undefined

    try {
        implementationDetails = await getImplementationAddress({
            client: rpcClient,
            simpleAccountAddress: senderAddressSimpleAccount,
            modularAccountAddress: senderAddressModularAccount,
        })
    } catch (error) {
        console.error('failed to get storage for account')
    }

    // new account
    if (!implementationDetails) {
        // brand new user
        return {
            address: senderAddressModularAccount,
            accountType: 'modular',
        }
    }

    const { accountAddress, implementationAddress } = implementationDetails

    if (
        implementationAddress.toLowerCase() ===
            ERC4337.ModularAccount.Implementation.toLowerCase() ||
        implementationAddress.toLowerCase() === ERC4337.ModularAccount.StorageOnly.toLowerCase()
    ) {
        // done
        return {
            address: accountAddress,
            accountType: 'modular',
        }
    } else if (
        implementationAddress.toLowerCase() === ERC4337.SimpleAccount.Implementation.toLowerCase()
    ) {
        // need to upgrade
        return {
            address: accountAddress,
            accountType: 'simple',
        }
    }

    throw new Error('Unknown implementation address')
}

const extractAddressFromError = (err: BaseError) => {
    let addr: Address | undefined
    const revertError = err.walk((err) => err instanceof ContractFunctionRevertedError)

    if (
        revertError instanceof ContractFunctionRevertedError &&
        revertError.data?.errorName === 'SenderAddressResult'
    ) {
        addr = revertError.data.args?.[0] as Address
    }
    return addr
}

const getEntryPoint06 = () => {
    if (!entryPointContractV06) {
        entryPointContractV06 = getContract({
            address: entryPoint06Address,
            abi: entryPoint06Abi,
            client: rpcClient,
        })
    }
    return entryPointContractV06
}

const getEntryPoint07 = () => {
    if (!entryPointContractV07) {
        entryPointContractV07 = getContract({
            address: entryPoint07Address,
            abi: entryPoint07Abi,
            client: rpcClient,
        })
    }
    return entryPointContractV07
}

const simpleAccountInitCode = (signerAddress: Address, salt: bigint) =>
    concatHex([
        ERC4337.SimpleAccount.Factory,
        encodeFunctionData({
            abi: [
                {
                    inputs: [
                        {
                            internalType: 'address',
                            name: 'owner',
                            type: 'address',
                        },
                        {
                            internalType: 'uint256',
                            name: 'salt',
                            type: 'uint256',
                        },
                    ],
                    name: 'createAccount',
                    outputs: [
                        {
                            internalType: 'contract SimpleAccount',
                            name: 'ret',
                            type: 'address',
                        },
                    ],
                    stateMutability: 'nonpayable',
                    type: 'function',
                },
            ],
            functionName: 'createAccount',
            args: [signerAddress, salt ?? 0n],
        }),
    ])

const modularAccountInitCode = (signerAddress: Address, salt: bigint) =>
    concatHex([
        ERC4337.ModularAccount.Factory,
        encodeFunctionData({
            abi: [
                {
                    type: 'function',
                    name: 'createSemiModularAccount',
                    inputs: [
                        {
                            name: 'owner',
                            type: 'address',
                            internalType: 'address',
                        },
                        {
                            name: 'salt',
                            type: 'uint256',
                            internalType: 'uint256',
                        },
                    ],
                    outputs: [
                        {
                            name: '',
                            type: 'address',
                            internalType: 'contract SemiModularAccountBytecode',
                        },
                    ],
                    stateMutability: 'nonpayable',
                },
            ],
            functionName: 'createSemiModularAccount',
            args: [signerAddress, salt ?? 0n],
        }),
    ])

export class FailedToGetStorageSlotError extends BaseError {
    override name = 'FailedToGetStorageSlotError'

    constructor(slot: string, slotDescriptor: string) {
        super(`Failed to get storage slot ${slot} (${slotDescriptor})`)
    }
}

// This is the default slot for the implementation address for Proxies
const PROXY_STORAGE_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

// aa-sdk
async function getImplementationAddress(args: {
    client: PublicClient
    simpleAccountAddress: Address
    modularAccountAddress: Address
}): Promise<
    | {
          implementationAddress: Address
          accountAddress: Address
      }
    | undefined
> {
    const { client, simpleAccountAddress, modularAccountAddress } = args
    const [simpleStorage, modularStorage] = await Promise.all([
        client.getStorageAt({
            address: simpleAccountAddress,
            slot: PROXY_STORAGE_SLOT,
        }),
        client.getStorageAt({
            address: modularAccountAddress,
            slot: PROXY_STORAGE_SLOT,
        }),
    ])

    if (!simpleStorage || !modularStorage) {
        throw new FailedToGetStorageSlotError(PROXY_STORAGE_SLOT, 'Proxy Implementation Address')
    }

    // The storage slot contains a full bytes32, but we want only the last 20 bytes.
    // So, slice off the leading `0x` and the first 12 bytes (24 characters), leaving the last 20 bytes, then prefix with `0x`.
    const simpleStorageHex = `0x${simpleStorage.slice(26)}`
    const modularStorageHex = `0x${modularStorage.slice(26)}`

    if (simpleStorageHex.toLowerCase() !== zeroAddress.toLowerCase()) {
        return {
            implementationAddress: simpleStorageHex as Address,
            accountAddress: simpleAccountAddress,
        }
    }

    // TODO: check this with getDefaultSMAV2StorageAddress()?
    if (modularStorageHex.toLowerCase() !== zeroAddress.toLowerCase()) {
        return {
            implementationAddress: modularStorageHex as Address,
            accountAddress: modularAccountAddress,
        }
    }
}
