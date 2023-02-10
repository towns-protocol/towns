/* eslint-disable no-restricted-imports */

import { BytesLike, ethers } from 'ethers'
import { GOERLI, LOCALHOST_CHAIN_ID } from '../Web3Constants'

import GoerliEventsAbi from '@harmony/contracts/goerli/abis/Events.abi.json' assert { type: 'json' }
import LocalhostEventsAbi from '@harmony/contracts/localhost/abis/Events.abi.json' assert { type: 'json' }

export type PromiseOrValue<T> = T | Promise<T>

// V2 smart contract shim
// todo: replace BaseContractShim with this when refactoring is done
export class BaseContractShim<
    T_LOCALHOST_CONTRACT extends ethers.Contract,
    T_LOCALHOST_INTERFACE extends ethers.utils.Interface,
    T_GOERLI_CONTRACT extends ethers.Contract,
    T_GOERLI_INTERFACE extends ethers.utils.Interface,
> {
    public readonly address: string
    public readonly chainId: number
    public readonly abi: ethers.ContractInterface
    public readonly contractInterface: ethers.utils.Interface
    public readonly provider: ethers.providers.Provider | undefined
    public readonly signer: ethers.Signer | undefined
    private eventsContract?: ethers.Contract
    private readContract?: ethers.Contract
    private writeContract?: ethers.Contract

    constructor(
        address: string,
        abi: ethers.ContractInterface,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ) {
        this.address = address
        this.chainId = chainId
        this.provider = provider
        this.signer = signer
        this.abi = abi
        this.contractInterface = new ethers.utils.Interface(abi as string)
    }

    public get interface(): T_LOCALHOST_INTERFACE | T_GOERLI_INTERFACE {
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.contractInterface as unknown as T_LOCALHOST_INTERFACE
            case GOERLI:
                return this.contractInterface as unknown as T_GOERLI_INTERFACE
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get eventsAbi(): ethers.ContractInterface {
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return LocalhostEventsAbi
            case GOERLI:
                return GoerliEventsAbi
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get events(): T_LOCALHOST_CONTRACT | T_GOERLI_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.eventsContract) {
            this.eventsContract = this.createEventsContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.eventsContract as unknown as T_LOCALHOST_CONTRACT
            case GOERLI:
                return this.eventsContract as unknown as T_GOERLI_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get read(): T_LOCALHOST_CONTRACT | T_GOERLI_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.createReadContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.readContract as unknown as T_LOCALHOST_CONTRACT
            case GOERLI:
                return this.readContract as unknown as T_GOERLI_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get write(): T_LOCALHOST_CONTRACT | T_GOERLI_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.createWriteContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.writeContract as unknown as T_LOCALHOST_CONTRACT
            case GOERLI:
                return this.writeContract as unknown as T_GOERLI_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public parseError(error: unknown): Error {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error as any
        const { errorData, errorMessage } = this.getErrorData(anyError)
        /**
         * Return early if we have trouble extracting the error data.
         * Don't know how to decode it.
         */
        if (!errorData) {
            console.log("don't know how to extract error data")
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: anyError,
            }
        }
        /**
         * Try to decode the error data. If it fails, return the original error message.
         */
        try {
            const errDescription = this.interface.parseError(errorData)
            const decodedError = {
                name: errDescription?.errorFragment.name ?? 'unknown',
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
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: e.message,
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private getErrorData(anyError: any): { errorData: BytesLike; errorMessage: string } {
        /**
         * Error data is nested in different places depending on whether the app is
         * running in jest/node, or which blockchain (goerli, or anvil).
         */
        // Case 1: jest/node error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorData: BytesLike = anyError.error?.error?.error?.data
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

    private createEventsContractInstance(): ethers.Contract {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(this.address, this.eventsAbi, this.provider)
    }

    private createReadContractInstance(): ethers.Contract {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(this.address, this.abi, this.provider)
    }

    private createWriteContractInstance(): ethers.Contract {
        if (!this.signer) {
            throw new Error('No signer')
        }
        return new ethers.Contract(this.address, this.abi, this.signer)
    }
}
