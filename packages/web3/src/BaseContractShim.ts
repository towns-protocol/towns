import { BytesLike, ethers } from 'ethers'
import { dlogger } from '@towns-protocol/dlog'
import { Connect } from './types/typechain'
export type PromiseOrValue<T> = T | Promise<T>

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

const logger = dlogger('csb:BaseContractShim')

export class BaseContractShim<T_CONTRACT extends ethers.Contract> {
    public readonly address: string
    public readonly provider: ethers.providers.Provider
    public readonly connect: Connect<T_CONTRACT>
    public contractInterface?: ethers.utils.Interface
    private readContract?: ethers.Contract
    private writeContract?: ethers.Contract

    constructor(
        address: string,
        provider: ethers.providers.Provider,
        connect: Connect<T_CONTRACT>,
    ) {
        this.address = address
        this.provider = provider
        this.connect = connect
    }

    public get interface(): ethers.utils.Interface {
        if (!this.contractInterface) {
            this.contractInterface = this.connect(this.address, this.provider).interface
        }
        return this.contractInterface
    }

    public get read(): T_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.connect(this.address, this.provider)
            if (!this.contractInterface) {
                this.contractInterface = this.readContract.interface
            }
        }
        return this.readContract as unknown as T_CONTRACT
    }

    public write(signer: ethers.Signer): T_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.connect(this.address, signer)
            if (!this.contractInterface) {
                this.contractInterface = this.writeContract.interface
            }
        } else {
            // update the signer if it has changed
            if (this.writeContract.signer !== signer) {
                this.writeContract = this.connect(this.address, signer)
            }
        }
        return this.writeContract as unknown as T_CONTRACT
    }

    public decodeFunctionResult<FnName extends keyof T_CONTRACT['functions']>(
        functionName: FnName,
        data: BytesLike,
    ) {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        return this.interface.decodeFunctionResult(functionName, data)
    }

    public decodeFunctionData<FnName extends keyof T_CONTRACT['functions']>(
        functionName: FnName,
        data: BytesLike,
    ) {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        return this.interface.decodeFunctionData(functionName, data)
    }

    public encodeFunctionData<
        FnName extends keyof T_CONTRACT['functions'],
        FnParams extends Parameters<T_CONTRACT['functions'][FnName]>,
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
        return this.interface.parseLog(log)
    }
}
