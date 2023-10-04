import { BytesLike, ethers } from 'ethers'
import { GOERLI, LOCALHOST_CHAIN_ID, SEPOLIA, BASE_GOERLI } from '../Web3Constants'

export type PromiseOrValue<T> = T | Promise<T>

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

interface Abis {
    readonly localhostAbi: ethers.ContractInterface
    readonly goerliAbi: ethers.ContractInterface
    readonly sepoliaAbi: ethers.ContractInterface
    readonly baseGoerliAbi: ethers.ContractInterface
}

// V2 smart contract shim
// todo: replace BaseContractShim with this when refactoring is done
export class BaseContractShimV3<
    T_LOCALHOST_CONTRACT extends ethers.Contract,
    T_LOCALHOST_INTERFACE extends ethers.utils.Interface,
    T_GOERLI_CONTRACT extends ethers.Contract,
    T_GOERLI_INTERFACE extends ethers.utils.Interface,
    T_SEPOLIA_CONTRACT extends ethers.Contract,
    T_SEPOLIA_INTERFACE extends ethers.utils.Interface,
    T_BASE_GOERLI_CONTRACT extends ethers.Contract,
    T_BASE_GOERLI_INTERFACE extends ethers.utils.Interface,
> {
    public readonly address: string
    public readonly chainId: number
    public readonly contractInterface: ethers.utils.Interface
    public readonly provider: ethers.providers.Provider | undefined
    public readonly signer: ethers.Signer | undefined
    private readonly abi: ethers.ContractInterface
    private readContract?: ethers.Contract
    private writeContract?: ethers.Contract

    constructor(
        address: string,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        abis: Abis,
    ) {
        this.address = address
        this.chainId = chainId
        this.provider = provider
        this.abi = getAbiForChain(chainId, abis)
        this.contractInterface = new ethers.utils.Interface(this.abi as string)
    }

    public get interface():
        | T_LOCALHOST_INTERFACE
        | T_GOERLI_INTERFACE
        | T_SEPOLIA_INTERFACE
        | T_BASE_GOERLI_INTERFACE {
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.contractInterface as unknown as T_LOCALHOST_INTERFACE
            case GOERLI:
                return this.contractInterface as unknown as T_GOERLI_INTERFACE
            case SEPOLIA:
                return this.contractInterface as unknown as T_SEPOLIA_INTERFACE
            case BASE_GOERLI:
                return this.contractInterface as unknown as T_BASE_GOERLI_INTERFACE
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get read():
        | T_LOCALHOST_CONTRACT
        | T_GOERLI_CONTRACT
        | T_SEPOLIA_CONTRACT
        | T_BASE_GOERLI_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.createReadContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.readContract as unknown as T_LOCALHOST_CONTRACT
            case GOERLI:
                return this.readContract as unknown as T_GOERLI_CONTRACT
            case SEPOLIA:
                return this.readContract as unknown as T_SEPOLIA_CONTRACT
            case BASE_GOERLI:
                return this.readContract as unknown as T_BASE_GOERLI_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public write(
        signer: ethers.Signer,
    ): T_LOCALHOST_CONTRACT | T_GOERLI_CONTRACT | T_SEPOLIA_CONTRACT | T_BASE_GOERLI_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.createWriteContractInstance(signer)
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.writeContract as unknown as T_LOCALHOST_CONTRACT
            case GOERLI:
                return this.writeContract as unknown as T_GOERLI_CONTRACT
            case SEPOLIA:
                return this.writeContract as unknown as T_SEPOLIA_CONTRACT
            case BASE_GOERLI:
                return this.writeContract as unknown as T_BASE_GOERLI_CONTRACT
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
                name: UNKNOWN_ERROR,
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
                name: errDescription?.errorFragment.name ?? UNKNOWN_ERROR,
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

    private createReadContractInstance(): ethers.Contract {
        if (!this.provider) {
            throw new Error('No provider')
        }
        return new ethers.Contract(this.address, this.abi, this.provider)
    }

    private createWriteContractInstance(signer: ethers.Signer): ethers.Contract {
        return new ethers.Contract(this.address, this.abi, signer)
    }
}

function getAbiForChain(chainId: number, abis: Abis): ethers.ContractInterface {
    switch (chainId) {
        case LOCALHOST_CHAIN_ID:
            return abis.localhostAbi
        case GOERLI:
            return abis.goerliAbi
        case SEPOLIA:
            return abis.sepoliaAbi
        case BASE_GOERLI:
            return abis.baseGoerliAbi
        default:
            throw new Error(`Unsupported chainId ${chainId}`)
    }
}
