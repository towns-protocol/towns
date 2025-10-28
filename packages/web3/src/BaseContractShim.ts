import { BytesLike, ContractTransaction, ethers } from 'ethers'
import { dlogger } from '@towns-protocol/utils'
import { Connect, ContractType } from './types/typechain'
import { Abi } from 'abitype'
import { TransactionOpts } from './types/ContractTypes'
import { wrapTransaction } from './space-dapp/wrapTransaction'
export type PromiseOrValue<T> = T | Promise<T>

export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

const logger = dlogger('csb:BaseContractShim')

export type OverrideExecution<T> = (args: {
    toAddress: string
    calldata: string
    value?: bigint
}) => Promise<T>

export class BaseContractShim<
    connect extends Connect<ethers.Contract>,
    T_CONTRACT extends ContractType<connect> = ContractType<connect>,
> {
    public readonly address: string
    public readonly provider: ethers.providers.Provider
    public readonly connect: Connect<T_CONTRACT>
    public readonly abi: Abi
    private _network?: ethers.providers.Network
    private _networkPromise?: Promise<ethers.providers.Network>
    private contractInterface?: T_CONTRACT['interface']
    private readContract?: T_CONTRACT
    private writeContract?: T_CONTRACT

    constructor(
        address: string,
        provider: ethers.providers.Provider,
        connect: Connect<T_CONTRACT>,
        abi: Abi,
    ) {
        this.address = address
        this.provider = provider
        this.connect = connect
        this.abi = abi
        void this.getNetwork()
    }

    public async getNetwork(): Promise<ethers.providers.Network | undefined> {
        if (this._network) {
            return this._network
        }

        if (!this._networkPromise) {
            this._networkPromise = this.provider.getNetwork()
        }

        try {
            this._network = await this._networkPromise
        } catch (error) {
            this._networkPromise = undefined
            logger.error('Failed to fetch network info:', error)
        }
        return this._network
    }

    public get interface(): T_CONTRACT['interface'] {
        if (!this.contractInterface) {
            this.readContract = this.connect(this.address, this.provider)
            this.contractInterface = this.readContract.interface
        }
        return this.contractInterface
    }

    public get read(): T_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.readContract) {
            this.readContract = this.connect(this.address, this.provider)
            this.contractInterface = this.readContract.interface
        }

        return this.readContract
    }

    public write(signer: ethers.Signer): T_CONTRACT {
        // lazy create an instance if it is not already cached
        if (!this.writeContract) {
            this.writeContract = this.connect(this.address, signer)
            this.contractInterface = this.writeContract.interface
        } else {
            // update the signer if it has changed
            if (this.writeContract.signer !== signer) {
                this.writeContract = this.connect(this.address, signer)
            }
        }
        return this.writeContract
    }

    /**
     * Executes a contract function call. If overrideExecution is provided, uses that instead of
     * the default blockchain transaction. This allows for custom handling of the call, such as
     * returning the raw calldata or implementing custom transaction logic.
     *
     * @param params.signer - The signer to use for the transaction
     * @param params.functionName - The name of the contract function to call
     * @param params.args - The arguments to pass to the function
     * @param params.overrideExecution - Optional function to override the default execution
     * @param params.transactionOpts - Optional transaction options
     * @returns The result of the function call or the override execution
     */
    public executeCall<
        T = ContractTransaction,
        FnName extends keyof T_CONTRACT['functions'] = keyof T_CONTRACT['functions'],
        Args extends Parameters<T_CONTRACT['functions'][FnName]> = Parameters<
            T_CONTRACT['functions'][FnName]
        >,
    >(params: {
        signer: ethers.Signer
        functionName: FnName
        args: Args
        value?: bigint
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }): Promise<T extends undefined ? ContractTransaction : T> {
        return (
            params.overrideExecution
                ? params.overrideExecution({
                      toAddress: this.address,
                      calldata: this.encodeFunctionData(params.functionName, params.args),
                      value: params.value,
                  })
                : wrapTransaction(
                      () =>
                          (
                              this.write(params.signer)[params.functionName] as (
                                  ...args: Args
                              ) => Promise<ContractTransaction>
                          )(
                              ...((params.value
                                  ? [...params.args, { value: params.value }]
                                  : params.args) as Args),
                          ),
                      params.transactionOpts,
                  )
        ) as Promise<T extends undefined ? ContractTransaction : T>
    }

    public decodeFunctionResult<FnName extends keyof T_CONTRACT['functions']>(
        functionName: FnName,
        data: BytesLike,
    ): Awaited<ReturnType<T_CONTRACT['functions'][FnName]>> {
        if (typeof functionName !== 'string') {
            throw new Error('functionName must be a string')
        }
        if (!this.interface.getFunction(functionName)) {
            throw new Error(`Function ${functionName} not found in contract interface`)
        }
        const decoded = this.interface.decodeFunctionResult(functionName, data)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decoded as Awaited<ReturnType<T_CONTRACT['functions'][FnName]>>
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
