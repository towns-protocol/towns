/* eslint-disable no-restricted-imports */

import { BytesLike, ethers } from 'ethers'
import { GOERLI, LOCALHOST_CHAIN_ID } from '../Web3Constants'

import GoerliEventsAbi from '@harmony/contracts/goerli/abis/Events.abi.json'
import LocalhostEventsAbi from '@harmony/contracts/localhost/abis/Events.abi.json'

export type PromiseOrValue<T> = T | Promise<T>

// V2 smart contract shim
// todo: replace BaseContractShim with this when refactoring is done
export class BaseContractShimV2<
    T_LOCALHOST extends ethers.Contract,
    T_GOERLI extends ethers.Contract | undefined,
> {
    public readonly address: string
    public readonly chainId: number
    public readonly abi: ethers.ContractInterface
    private readonly provider: ethers.providers.Provider | undefined
    private readonly signer: ethers.Signer | undefined
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

    public get events(): T_GOERLI | T_LOCALHOST {
        // lazy create an instance if it is not already cached
        if (!this.eventsContract) {
            this.eventsContract = this.createEventsContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.eventsContract as unknown as T_LOCALHOST
            case GOERLI:
                return this.eventsContract as unknown as T_GOERLI
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get read(): T_GOERLI | T_LOCALHOST {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.createReadContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.readContract as unknown as T_LOCALHOST
            case GOERLI:
                return this.readContract as unknown as T_GOERLI
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get write(): T_GOERLI | T_LOCALHOST {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.createWriteContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.writeContract as unknown as T_LOCALHOST
            case GOERLI:
                return this.writeContract as unknown as T_GOERLI
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public parseError(error: unknown): Error {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error as any
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const errData: BytesLike = anyError.error?.error?.error?.data
        if (!errData) {
            return {
                name: 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: anyError?.message,
            }
        }
        try {
            const errDescription = this.write?.interface.parseError(errData)
            const decodedError = {
                name: errDescription?.errorFragment.name ?? 'unknown',
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: anyError.error?.error?.error?.message,
            }
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
