import { keccak256 } from 'ethereum-cryptography/keccak'
import { Permission } from '@river-build/web3'
import { bin_toHexString, isJest, isNodeEnv } from '@river-build/dlog'
import { isBrowser, isNode } from 'browser-or-node'

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

export function isTestEnv(): boolean {
    return Boolean(process.env.JEST_WORKER_ID)
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
    if (isNode || isJest()) {
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
    if (isNodeEnv()) {
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
