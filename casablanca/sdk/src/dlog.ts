import debug, { Debugger } from 'debug'
import { bin_toHexString, isHexString, shortenHexString } from './types'

/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

const cloneAndFormat = (obj: any): any => {
    if (typeof obj === 'string') {
        return isHexString(obj) ? shortenHexString(obj) : obj
    }

    if (obj instanceof Uint8Array) {
        return shortenHexString(bin_toHexString(obj))
    }

    if (Array.isArray(obj)) {
        return obj.map((e) => cloneAndFormat(e))
    }

    if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {}
        for (const key in obj) {
            let newKey = key
            if (typeof key === 'string' && isHexString(key)) {
                newKey = shortenHexString(key)
            }
            newObj[newKey] = cloneAndFormat(obj[key])
        }
        return newObj
    }

    return obj
}

export interface DLogger {
    (...args: any[]): void

    enabled: boolean
    namespace: string
    extend: (namespace: string, delimiter?: string) => DLogger
    baseDebug: Debugger
}

const makeDlog = (d: Debugger): DLogger => {
    const dlog: any = (...args: any[]): void => {
        if (!d.enabled || args.length === 0) {
            return
        }

        const fmt: string[] = []
        const newArgs: any[] = []

        for (let i = 0; i < args.length; i++) {
            let c = args[i]

            if (typeof c === 'string') {
                fmt.push('%s ')
                if (isHexString(c)) {
                    c = shortenHexString(c)
                }
                newArgs.push(c)
            } else if (typeof c === 'object' && c !== null) {
                fmt.push('%O\n')
                newArgs.push(cloneAndFormat(c))
            } else {
                fmt.push('%O ')
                newArgs.push(c)
            }
        }

        d(fmt.join(''), ...newArgs)
    }

    dlog.baseDebug = d
    dlog.namespace = d.namespace

    dlog.extend = (sub: string, delimiter?: string): DLogger => {
        return makeDlog(d.extend(sub, delimiter))
    }

    Object.defineProperty(dlog, 'enabled', {
        enumerable: true,
        configurable: false,
        get: () => d.enabled,
        set: (v) => (d.enabled = v),
    })

    return dlog as DLogger
}

/**
 * Create a new logger with namespace `ns`.
 * It's based on the `debug` package logger with custom formatter:
 * All aguments are formatted, hex strings and UInt8Arrays are printer as hex and shortened.
 * No %-specifiers are supported.
 *
 * @param ns Namespace for the logger.
 * @returns New logger with namespace `ns`.
 */
export const dlog = (ns: string): DLogger => {
    return makeDlog(debug(ns))
}
