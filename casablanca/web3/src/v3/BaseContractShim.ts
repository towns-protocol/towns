import { BytesLike, ethers } from 'ethers'
import { LOCALHOST_CHAIN_ID, BASE_SEPOLIA } from '../Web3Constants'

export type PromiseOrValue<T> = T | Promise<T>

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

interface Abis {
    readonly [chainId: number]: ethers.ContractInterface
}

// V2 smart contract shim
// todo: replace BaseContractShim with this when refactoring is done
export class BaseContractShim<
    T_LOCALHOST_CONTRACT extends ethers.Contract,
    T_LOCALHOST_INTERFACE extends ethers.utils.Interface,
    T_BASE_SEPOLIA_CONTRACT extends ethers.Contract,
    T_BASE_SEPOLIA_INTERFACE extends ethers.utils.Interface,
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

    public get interface(): T_LOCALHOST_INTERFACE | T_BASE_SEPOLIA_INTERFACE {
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.contractInterface as unknown as T_LOCALHOST_INTERFACE
            case BASE_SEPOLIA:
                return this.contractInterface as unknown as T_BASE_SEPOLIA_INTERFACE
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public get read(): T_LOCALHOST_CONTRACT | T_BASE_SEPOLIA_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.createReadContractInstance()
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.readContract as unknown as T_LOCALHOST_CONTRACT
            case BASE_SEPOLIA:
                return this.readContract as unknown as T_BASE_SEPOLIA_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    public write(signer: ethers.Signer): T_LOCALHOST_CONTRACT | T_BASE_SEPOLIA_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.createWriteContractInstance(signer)
        } else {
            // update the signer if it has changed
            if (this.writeContract.signer !== signer) {
                this.writeContract = this.createWriteContractInstance(signer)
            }
        }
        switch (this.chainId) {
            case LOCALHOST_CHAIN_ID:
                return this.writeContract as unknown as T_LOCALHOST_CONTRACT
            case BASE_SEPOLIA:
                return this.writeContract as unknown as T_BASE_SEPOLIA_CONTRACT
            default:
                throw new Error(`Unsupported chainId ${this.chainId}`)
        }
    }

    // TODO: better type enforcing
    public encodeFunctionData(functionName: string, args: readonly unknown[]): string {
        const fragment = this.interface.getFunction(functionName)
        if (!fragment) {
            throw new Error(`Unknown function ${functionName}`)
        }

        return this.interface.encodeFunctionData(fragment, args)
    }

    public parseError(error: unknown): Error {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error as any
        const { errorData, errorMessage, errorName } = this.getErrorData(anyError)
        /**
         * Return early if we have trouble extracting the error data.
         * Don't know how to decode it.
         */
        if (!errorData) {
            console.log(
                `parseError ${errorName}: no error data, or don't know how to extract error data`,
            )
            return {
                name: errorName ?? UNKNOWN_ERROR,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                message: errorMessage ?? anyError,
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
    private getErrorData(anyError: any): {
        errorData: BytesLike
        errorMessage: string
        errorName: string
    } {
        /**
         * Error data is nested in different places depending on whether the app is
         * running in jest/node, or which blockchain (goerli, or anvil).
         */
        // Case: jest/node error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorData: BytesLike = anyError.error?.error?.error?.data
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorMessage: string = anyError.error?.error?.error?.message
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        let errorName: string = anyError.error?.error?.error?.name

        if (!errorData) {
            // Case: Browser (anvil || base goerli)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorData = anyError.error?.error?.data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorMessage = anyError.error?.error?.message
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorName = anyError.error?.error?.name
        }

        if (!errorData) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorData = anyError.data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorData = anyError?.data
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorMessage = anyError?.message
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            errorName = anyError?.name
        }

        if (!errorData) {
            // sometimes it's a stringified object under anyError.reason
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const reason = anyError?.reason
                if (typeof reason === 'string') {
                    const errorMatch = reason?.match(/error\\":\{([^}]+)\}/)?.[1]
                    if (errorMatch) {
                        const parsedData = JSON.parse(`{${errorMatch?.replace(/\\/g, '')}}`)
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        errorData = parsedData?.data
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        errorMessage = parsedData?.message
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        errorName = parsedData?.name
                    }
                }
            } catch (error) {
                console.log('error parsing reason', error)
            }
        }

        return {
            errorData,
            errorMessage,
            errorName,
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
    if (!abis[chainId]) {
        throw new Error(`Unsupported chainId ${chainId}`)
    }
    return abis[chainId]
}
