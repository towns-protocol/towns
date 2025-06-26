import { utils } from 'ethers'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { Permission } from '@towns-protocol/web3'
import {
    bin_toHexString,
    isTestEnv,
    isNodeEnv,
    isBrowser,
    bin_fromHexString,
} from '@towns-protocol/dlog'

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

// In string form an ethereum address is 42 characters long, should start with 0x and TODO: have ERC-55 checksum.
// In binary form it is 20 bytes long.
export const isEthereumAddress = (address: string | Uint8Array): boolean => {
    if (address instanceof Uint8Array) {
        return address.length === 20
    } else if (typeof address === 'string') {
        return utils.isAddress(address)
    }
    return false
}

export const ethereumAddressToBytes = (address: string): Uint8Array => bin_fromHexString(address)

export const ethereumAddressFromBytes = (bytes: Uint8Array): string => bin_toHexString(bytes)

export const ethereumAddressAsString = (address: string | Uint8Array): string =>
    typeof address === 'string' ? address : ethereumAddressFromBytes(address)

export const ethereumAddressAsBytes = (address: string | Uint8Array): Uint8Array =>
    typeof address === 'string' ? ethereumAddressToBytes(address) : address

export function stripUndefinedMetadata(
    obj: Record<string, Uint8Array | undefined>,
): { [key: string]: Uint8Array } | undefined {
    const result: Record<string, Uint8Array> = {}

    for (const key in obj) {
        const val = obj[key]
        if (val !== undefined) {
            result[key] = val
        }
    }

    return Object.keys(result).length > 0 ? result : undefined
}

export function promiseTry<T>(fn: () => T | Promise<T>): Promise<T> {
    return Promise.resolve(fn())
}

export function hashString(string: string): string {
    const encoded = new TextEncoder().encode(string)
    const buffer = keccak256(encoded)
    return bin_toHexString(buffer)
}

export function usernameChecksum(username: string, streamId: string) {
    return hashString(`${username.toLowerCase()}:${streamId}`)
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

export class MockEntitlementsDelegate {
    async isEntitled(
        _spaceId: string | undefined,
        _channelId: string | undefined,
        _user: string,
        _permission: Permission,
    ): Promise<boolean> {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return true
    }
}

export function removeCommon(x: string[], y: string[]): string[] {
    const result = []
    let i = 0
    let j = 0

    while (i < x.length && j < y.length) {
        if (x[i] < y[j]) {
            result.push(x[i])
            i++
        } else if (x[i] > y[j]) {
            j++
        } else {
            i++
            j++
        }
    }

    // Append remaining elements from x
    if (i < x.length) {
        result.push(...x.slice(i))
    }

    return result
}

export function getEnvVar(key: string, defaultValue: string = ''): string {
    if (isNodeEnv || isTestEnv()) {
        return process.env[key] ?? defaultValue
    }

    if (isBrowser) {
        if (localStorage != undefined) {
            return localStorage.getItem(key) ?? defaultValue
        }
    }

    return defaultValue
}

export function isMobileSafari(): boolean {
    if (isNodeEnv) {
        return false
    }
    if (!navigator || !navigator.userAgent) {
        return false
    }
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function isBaseUrlIncluded(baseUrls: string[], fullUrl: string): boolean {
    const urlObj = new URL(fullUrl)
    const fullUrlBase = `${urlObj.protocol}//${urlObj.host}`

    return baseUrls.some((baseUrl) => fullUrlBase === baseUrl.trim())
}

export const randomUrlSelector = (urls: string) => {
    const u = urls.split(',')
    if (u.length === 0) {
        throw new Error('No urls for backend provided')
    } else if (u.length === 1) {
        return u[0]
    } else {
        return u[Math.floor(Math.random() * u.length)]
    }
}

export async function getTime<T>(fn: () => Promise<T>) {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return { result, time: end - start }
}

export const randomBytes = (len: number) => crypto.getRandomValues(new Uint8Array(len))
