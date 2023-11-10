import { keccak256 } from 'ethereum-cryptography/keccak'
import { bin_toHexString } from './binary'

export function unsafeProp<K extends keyof any | undefined>(prop: K): boolean {
    return prop === '__proto__' || prop === 'prototype' || prop === 'constructor'
}

export function safeSet<O extends Record<any, any>, K extends keyof O>(
    obj: O,
    prop: K,
    value: O[K],
): void {
    if (unsafeProp(prop)) {
        throw new Error('Trying to modify prototype or constructor')
    }

    obj[prop] = value
}

export function promiseTry<T>(fn: () => T | Promise<T>): Promise<T> {
    return Promise.resolve(fn())
}

export function hashString(string: string): string {
    const encoded = new TextEncoder().encode(string)
    const buffer = keccak256(encoded)
    return bin_toHexString(buffer)
}

/**
 * IConnectError contains a subset of the properties in ConnectError
 */
export type IConnectError = {
    code: number
}

export function isIConnectError(obj: unknown): obj is { code: number } {
    return obj !== null && typeof obj === 'object' && 'code' in obj && typeof obj.code === 'number'
}

export function isTestEnv(): boolean {
    return Boolean(process.env.JEST_WORKER_ID)
}
