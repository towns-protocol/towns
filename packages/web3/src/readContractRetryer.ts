import { ethers } from 'ethers'
import { Connect, ContractType } from './types/typechain'
import { dlogger } from '@towns-protocol/utils'
const logger = dlogger('csb:readContractRetryer')

type RetryOptions = {
    maxAttempts?: number
    initialRetryDelay?: number
    maxRetryDelay?: number
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 4,
    initialRetryDelay: 1000,
    maxRetryDelay: 8000,
}

export function readRetryWrapper<T_CONTRACT extends ContractType<Connect<ethers.Contract>>>(
    contract: T_CONTRACT,
    retryOptions: RetryOptions = {},
): T_CONTRACT {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
    const wrapper = Object.create(contract) as T_CONTRACT

    // ethers/typechain contracts have a set of functions.
    // these functions are defined on the class itself, i.e. contract[myFunction]
    // as well as in these properties, i.e. contract.callStatic.myFunction
    // so, we're gonna replace all these with retry wrapper
    const contractMethodProperties = [
        'functions',
        'callStatic',
        'estimateGas',
        'populateTransaction',
    ] as const

    const functionNames = Object.keys(contract.functions)

    const objectsWithContractMethods = ['root', ...contractMethodProperties]

    for (const target of objectsWithContractMethods) {
        const isRoot = target === 'root'
        const source = isRoot ? wrapper : (wrapper[target] as Record<string, unknown>)
        const destination = isRoot ? wrapper : Object.create((wrapper[target] as object) || {})

        for (const funcName of functionNames) {
            const ogFunction = source?.[funcName] as unknown
            if (typeof ogFunction === 'function') {
                Object.defineProperty(destination, funcName, {
                    value: function (this: T_CONTRACT, ...args: unknown[]) {
                        return (async () => {
                            let attempt = 0

                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                attempt++

                                try {
                                    const result = (
                                        ogFunction as (...args: unknown[]) => unknown
                                    ).apply(this, args)

                                    return await result
                                } catch (error) {
                                    if (attempt >= opts.maxAttempts) {
                                        logger.error(
                                            `Read contract call failed after ${attempt} attempts:`,
                                            error,
                                        )
                                        throw error
                                    }

                                    const retryDelay = Math.min(
                                        opts.maxRetryDelay,
                                        opts.initialRetryDelay * Math.pow(2, attempt - 1),
                                    )

                                    logger.log(
                                        `Read contract call failed for ${funcName} (attempt ${attempt}/${opts.maxAttempts}), retrying in ${retryDelay}ms:`,
                                        error,
                                    )
                                    await new Promise((resolve) => setTimeout(resolve, retryDelay))
                                }
                            }
                        })()
                    },
                    configurable: true,
                    writable: true,
                })
            }
        }

        if (!isRoot) {
            Object.defineProperty(wrapper, target, {
                value: destination,
                configurable: true,
                writable: true,
            })
        }
    }

    return wrapper
}
