import { localhost, baseGoerli, baseSepolia } from 'viem/chains'
import { LOCALHOST_CHAIN_ID, BASE_GOERLI, BASE_SEPOLIA } from '../Web3Constants'
import {
    Abi,
    Address,
    Chain,
    EncodeFunctionDataParameters,
    PublicClient,
    ReadContractParameters,
    ReadContractReturnType,
    SimulateContractParameters,
    WalletClient,
    encodeFunctionData,
} from 'viem'
import { SpaceDappTransaction } from './types'

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

type Abis = {
    readonly localhostAbi: Abi
    readonly goerliAbi: Abi
    readonly sepoliaAbi: Abi
}

export class BaseContractShim<TAbis extends Abis> {
    public readonly address: Address
    public readonly chainId: number
    public readonly abi: TAbis['localhostAbi'] | TAbis['sepoliaAbi']
    private publicClient: PublicClient | undefined

    constructor(
        address: Address,
        chainId: number,
        publicClient: PublicClient | undefined,
        abis: TAbis,
    ) {
        this.address = address
        this.chainId = chainId
        this.abi = getAbiForChain(chainId, abis)
        this.publicClient = publicClient
    }

    public parseError(error: unknown): Error {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error
        const { errorData, errorMessage } = this.getErrorData(anyError)
        /**
         * Return early if we have trouble extracting the error data.
         * Don't know how to decode it.
         */
        if (!errorData) {
            console.log("don't know how to extract error data")
            return {
                name: UNKNOWN_ERROR,
                message: anyError as string,
            }
        }
        /**
         * Try to decode the error data. If it fails, return the original error message.
         */
        try {
            const errDescription = errorData
            const decodedError = {
                name: errDescription ?? UNKNOWN_ERROR,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                message: errorMessage,
            }
            console.log('decodedError', decodedError)
            return decodedError
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            // Cannot decode error
            console.error('cannot decode error', e)
            return {
                name: UNKNOWN_ERROR,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getErrorData(anyError: any): { errorData: any; errorMessage: string } {
        /**
         * Error data is nested in different places depending on whether the app is
         * running in jest/node, or which blockchain (goerli, or anvil).
         */
        // Case 1: jest/node error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorData = anyError.error?.error?.error?.data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorMessage: string = anyError.error?.error?.error?.message
        if (!errorData) {
            // Case 2: Browser (goerli)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorData = anyError.error?.data?.originalError?.data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorMessage = anyError.error?.data?.originalError?.message
        }
        if (!errorData) {
            // Case 3: Browser (anvil)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorData = anyError.error?.data?.data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorMessage = anyError.error?.data?.message
        }
        if (!errorData) {
            // Case 4: Unknown
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorMessage = anyError.message
        }
        return {
            errorData,
            errorMessage,
        }
    }

    public read<TFunctionName extends string>({
        functionName,
        args,
    }: Omit<ReadContractParameters<typeof this.abi, TFunctionName>, 'address' | 'abi'>): Promise<
        ReadContractReturnType<typeof this.abi, TFunctionName>
    > {
        if (!this.publicClient) {
            throw new Error('No provider')
        }
        return this.publicClient.readContract({
            address: this.address,
            abi: this.abi,
            functionName,
            args,
        } as unknown as ReadContractParameters<typeof this.abi, TFunctionName>)
    }

    public async write<TFunctionName extends string>({
        wallet,
        functionName,
        args,
    }: Omit<
        SimulateContractParameters<typeof this.abi, TFunctionName>,
        'chain' | 'address' | 'abi'
    > & {
        wallet: WalletClient
    }): Promise<SpaceDappTransaction> {
        if (!this.publicClient) {
            throw new Error('[writeContract] No public client')
        }
        const chain = getChain(this.chainId)

        try {
            const { request } = await this.publicClient.simulateContract({
                address: this.address,
                abi: this.abi,
                functionName,
                args,
                account: wallet.account,
            } as SimulateContractParameters)

            const hash = await wallet.writeContract({
                ...request,
                chain,
            })

            return {
                hash,
                wait: (confirmations?: number) => {
                    if (!this.publicClient) {
                        throw new Error('No provider')
                    }
                    return this.publicClient.waitForTransactionReceipt({
                        hash,
                        confirmations,
                    })
                },
            }
        } catch (error: unknown) {
            throw new Error(error as string)
        }
    }

    public encodeFunctionData<TFunctionName extends string>({
        functionName,
        args,
    }: Omit<EncodeFunctionDataParameters<typeof this.abi, TFunctionName>, 'abi'>) {
        return encodeFunctionData({
            abi: this.abi,
            functionName,
            args,
        } as EncodeFunctionDataParameters)
    }
}

function getAbiForChain<TAbi extends Abis>(chainId: number, abis: TAbi) {
    switch (chainId) {
        case LOCALHOST_CHAIN_ID:
            return abis.localhostAbi
        case BASE_GOERLI:
            return abis.goerliAbi
        case BASE_SEPOLIA:
            return abis.sepoliaAbi
        default:
            throw new Error(`Unsupported chainId ${chainId}`)
    }
}

function getChain(chainId: number): Chain {
    switch (chainId) {
        case LOCALHOST_CHAIN_ID:
            return localhost
        case BASE_GOERLI:
            return baseGoerli
        case BASE_SEPOLIA:
            return baseSepolia
        default:
            throw new Error(`Unsupported chainId ${chainId}`)
    }
}
