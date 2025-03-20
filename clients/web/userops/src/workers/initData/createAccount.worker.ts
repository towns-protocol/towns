import { Address } from '@towns-protocol/web3'
import { entryPoint06Abi, entryPoint06Address } from 'viem/account-abstraction'
import {
    concatHex,
    ContractFunctionRevertedError,
    createPublicClient,
    encodeFunctionData,
    getContract,
    GetContractReturnType,
    http,
    PublicClient,
} from 'viem'
import { createAccountAbi as simpleCreateAccountAbi } from '../../lib/permissionless/accounts/simple/abi'
import { BaseError } from 'viem'
export type CreateAccountWorkerMessage = {
    factoryAddress: string
    signerAddress: string
    rpcUrl: string
    salt?: bigint
}

export type CreateAccountWorkerReturn = {
    initCode: string
    addr: Address
}

let client: PublicClient
let entryPointContract: GetContractReturnType<
    typeof entryPoint06Abi,
    typeof client,
    typeof entryPoint06Address
>

self.onmessage = async (e: MessageEvent<CreateAccountWorkerMessage>) => {
    const { factoryAddress, signerAddress, rpcUrl, salt } = e.data

    let initCode: string
    let addr: Address

    if (!client) {
        client = createPublicClient({
            transport: http(rpcUrl),
        })
    }

    if (!entryPointContract) {
        entryPointContract = getContract({
            address: entryPoint06Address,
            abi: entryPoint06Abi,
            client,
        })
    }

    try {
        initCode = concatHex([
            factoryAddress as `0x${string}`,
            encodeFunctionData({
                abi: simpleCreateAccountAbi,
                functionName: 'createAccount',
                args: [signerAddress as `0x${string}`, salt ?? 0n],
            }),
        ])

        try {
            await entryPointContract.simulate.getSenderAddress([initCode as `0x${string}`])
            throw new Error('getSenderAddress: unexpected result')
        } catch (err: unknown) {
            if (err instanceof BaseError) {
                const revertError = err.walk((err) => err instanceof ContractFunctionRevertedError)

                if (
                    revertError instanceof ContractFunctionRevertedError &&
                    revertError.data?.errorName === 'SenderAddressResult'
                ) {
                    addr = revertError.data.args?.[0] as Address
                } else {
                    throw err
                }
            } else {
                throw err
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        throw new Error(`Worker failed: ${error.message} - Stack: ${error.stack}`)
    }

    const response: CreateAccountWorkerReturn = { initCode, addr }

    self.postMessage(response)
}
