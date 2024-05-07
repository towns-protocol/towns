import { BytesLike, ethers } from 'ethers'
import { dlogger } from '@river-build/dlog'
import { ContractVersion } from '../IStaticContractsInfo'

export type PromiseOrValue<T> = T | Promise<T>

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

const logger = dlogger('csb:BaseContractShim')

// V2 smart contract shim
// todo: replace BaseContractShim with this when refactoring is done
export class BaseContractShim<
    T_DEV_CONTRACT extends ethers.Contract,
    T_DEV_INTERFACE extends ethers.utils.Interface,
    T_VERSIONED_CONTRACT extends ethers.Contract,
    T_VERSIONED_INTERFACE extends ethers.utils.Interface,
> {
    public readonly address: string
    public readonly version: ContractVersion
    public readonly contractInterface: ethers.utils.Interface
    public readonly provider: ethers.providers.Provider | undefined
    public readonly signer: ethers.Signer | undefined
    private readonly abi: ethers.ContractInterface
    private readContract?: ethers.Contract
    private writeContract?: ethers.Contract

    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
        abis: Record<ContractVersion, ethers.ContractInterface>,
    ) {
        if (!abis[version]) {
            throw new Error(`No ABI for version ${version}`)
        }
        this.address = address
        this.version = version
        this.provider = provider
        this.abi = abis[version]
        this.contractInterface = new ethers.utils.Interface(this.abi as string)
    }

    public get interface(): T_DEV_INTERFACE | T_VERSIONED_INTERFACE {
        switch (this.version) {
            case ContractVersion.dev:
                return this.contractInterface as unknown as T_DEV_INTERFACE
            case ContractVersion.v3:
                return this.contractInterface as unknown as T_VERSIONED_INTERFACE
            default:
                throw new Error(`Unsupported version ${this.version}`)
        }
    }

    public get read(): T_DEV_CONTRACT | T_VERSIONED_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.createReadContractInstance()
        }
        switch (this.version) {
            case ContractVersion.dev:
                return this.readContract as unknown as T_DEV_CONTRACT
            case ContractVersion.v3:
                return this.readContract as unknown as T_VERSIONED_CONTRACT
            default:
                throw new Error(`Unsupported version ${this.version}`)
        }
    }

    public write(signer: ethers.Signer): T_DEV_CONTRACT | T_VERSIONED_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.createWriteContractInstance(signer)
        } else {
            // update the signer if it has changed
            if (this.writeContract.signer !== signer) {
                this.writeContract = this.createWriteContractInstance(signer)
            }
        }
        switch (this.version) {
            case ContractVersion.dev:
                return this.writeContract as unknown as T_DEV_CONTRACT
            case ContractVersion.v3:
                return this.writeContract as unknown as T_VERSIONED_CONTRACT
            default:
                throw new Error(`Unsupported version ${this.version}`)
        }
    }

    public decodeFunctionResult<
        FnName extends keyof T_DEV_CONTRACT['functions'] | keyof T_VERSIONED_CONTRACT['functions'],
    >(functionName: FnName, data: BytesLike) {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        return this.interface.decodeFunctionResult(functionName, data)
    }

    public decodeFunctionData<
        FnName extends keyof T_DEV_CONTRACT['functions'] | keyof T_VERSIONED_CONTRACT['functions'],
    >(functionName: FnName, data: BytesLike) {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        return this.interface.decodeFunctionData(functionName, data)
    }

    public encodeFunctionData<
        FnName extends keyof T_DEV_CONTRACT['functions'] | keyof T_VERSIONED_CONTRACT['functions'],
        FnParams extends
            | Parameters<T_DEV_CONTRACT['functions'][FnName]>
            | Parameters<T_VERSIONED_CONTRACT['functions'][FnName]>,
    >(functionName: FnName, args: FnParams): string {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        return this.interface.encodeFunctionData(functionName, args)
    }

    public parseError(error: unknown): Error & {
        code?: string
        data?: unknown
    } {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const anyError = error as any
        const { errorData, errorMessage, errorName } = this.getErrorData(anyError)
        /**
         * Return early if we have trouble extracting the error data.
         * Don't know how to decode it.
         */
        if (!errorData) {
            logger.log(
                `parseError ${errorName}: no error data, or don't know how to extract error data`,
            )
            return {
                name: errorName ?? UNKNOWN_ERROR,
                message: errorMessage ?? anyError,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                code: anyError?.code,
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
            logger.log('decodedError', decodedError)
            return decodedError
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            // Cannot decode error
            logger.error('cannot decode error', e)
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
            // sometimes it's a stringified object under anyError.reason or anyError.message
            try {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const reason = anyError?.reason || anyError?.message
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
                logger.error('error parsing reason', error)
            }
        }

        return {
            errorData,
            errorMessage,
            errorName,
        }
    }

    public parseLog(log: ethers.providers.Log) {
        return this.contractInterface.parseLog(log)
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
