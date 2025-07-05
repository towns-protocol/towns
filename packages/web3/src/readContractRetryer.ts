import { ethers } from 'ethers'
import { Connect, ContractType } from './types/typechain'
import { dlogger } from '@towns-protocol/dlog'
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

async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
    let attempt = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
        attempt++

        try {
            return await operation()
        } catch (error) {
            if (attempt >= opts.maxAttempts) {
                logger.error(`Read contract call failed after ${attempt} attempts:`, error)
                throw error
            }

            const retryDelay = Math.min(
                opts.maxRetryDelay,
                opts.initialRetryDelay * Math.pow(2, attempt - 1),
            )

            logger.log(
                `Read contract call failed (attempt ${attempt}/${opts.maxAttempts}), retrying in ${retryDelay}ms:`,
                error,
            )
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
        }
    }
}

export function readRetryWrapper<T_CONTRACT extends ContractType<Connect<ethers.Contract>>>(
    contract: T_CONTRACT,
    retryOptions: RetryOptions = {},
): T_CONTRACT {
    const wrapper = Object.create(Object.getPrototypeOf(contract) as object) as T_CONTRACT

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

    // add them to the wrapper only if they exist on the original contract
    for (const key of contractMethodProperties) {
        if (contract[key] && typeof contract[key] === 'object') {
            Object.defineProperty(wrapper, key, {
                value: {},
            })
        }
    }

    const functionNames = Object.keys(contract.functions)

    // copy all non-contract-method properties
    // ethers defines these all as readonly, i don't think it's important that we do that - these are read only methods that we care about
    for (const key of Object.getOwnPropertyNames(contract)) {
        const descriptor = Object.getOwnPropertyDescriptor(contract, key)
        if (
            descriptor &&
            typeof contract[key] !== 'function' &&
            !contractMethodProperties.includes(key as (typeof contractMethodProperties)[number]) &&
            !Object.prototype.hasOwnProperty.call(wrapper, key)
        ) {
            try {
                Object.defineProperty(wrapper, key, descriptor)
            } catch {
                // skip properties that can't be defined (some may be non-configurable)
            }
        }
    }

    // the functions on the class
    for (const funcName of functionNames) {
        const ogFunction = contract[funcName]
        if (typeof ogFunction === 'function') {
            ;(wrapper as Record<string, unknown>)[funcName] = function (...args: unknown[]) {
                return withRetry(
                    () =>
                        (ogFunction as (...args: unknown[]) => Promise<unknown>).apply(
                            contract,
                            args,
                        ),
                    retryOptions,
                )
            }
        }
    }

    // the functions nested on the contract properties
    for (const prop of contractMethodProperties) {
        // check if the property exists on the contract before accessing its methods
        if (contract[prop] && typeof contract[prop] === 'object') {
            for (const funcName of functionNames) {
                const ogFunction = contract[prop][funcName]
                if (typeof ogFunction === 'function') {
                    wrapper[prop][funcName] = function (...args: unknown[]) {
                        return withRetry(
                            () =>
                                (ogFunction as (...args: unknown[]) => Promise<unknown>).apply(
                                    contract[prop],
                                    args,
                                ),
                            retryOptions,
                        )
                    }
                }
            }
        }
    }

    // copy other methods that might exist
    if (contract.deployed && typeof contract.deployed === 'function') {
        wrapper.deployed = function () {
            return withRetry(() => contract.deployed(), retryOptions)
        }
    }

    if (contract.attach && typeof contract.attach === 'function') {
        wrapper.attach = contract.attach.bind(contract)
    }

    if (contract.connect && typeof contract.connect === 'function') {
        wrapper.connect = contract.connect.bind(contract)
    }

    return wrapper
}
