import debug, { Debugger } from 'debug'
import { isHexString, shortenHexString, bin_toHexString } from './binary'
import { isNode } from 'browser-or-node'

const MAX_CALL_STACK_SZ = 18

const hasOwnProperty = <Y extends PropertyKey>(obj: object, prop: Y): obj is Record<Y, unknown> => {
    return Object.prototype.hasOwnProperty.call(obj, prop)
}

const cloneAndFormat = (obj: unknown, depth = 0, seen = new WeakSet()): unknown => {
    if (depth > MAX_CALL_STACK_SZ) {
        return 'MAX_CALL_STACK_SZ exceeded'
    }

    if (typeof obj === 'object' && obj !== null) {
        if (seen.has(obj)) {
            return '[circular reference]'
        }
        seen.add(obj)
    }

    if (typeof obj === 'string') {
        return isHexString(obj) ? shortenHexString(obj) : obj
    }

    if (obj instanceof Uint8Array) {
        return shortenHexString(bin_toHexString(obj))
    }

    if (Array.isArray(obj)) {
        return obj.map((e) => cloneAndFormat(e, depth + 1), seen)
    }

    if (typeof obj === 'object' && obj !== null) {
        if (obj instanceof Error) {
            return obj.stack || obj.message
        }

        const newObj: Record<PropertyKey, unknown> = {}
        for (const key in obj) {
            let newKey = key
            if (typeof key === 'string' && isHexString(key)) {
                newKey = shortenHexString(key)
            }
            if (hasOwnProperty(obj, key)) {
                if (key == 'emitter') {
                    newObj[newKey] = '[emitter]'
                } else {
                    newObj[newKey] = cloneAndFormat(obj[key], depth + 1, seen)
                }
            }
        }
        return newObj
    }

    return obj
}

export interface DLogger {
    (...args: unknown[]): void

    enabled: boolean
    namespace: string
    extend: (namespace: string, delimiter?: string) => DLogger
    baseDebug: Debugger
}

const makeDlog = (d: Debugger): DLogger => {
    const dlog = (...args: unknown[]): void => {
        if (!d.enabled || args.length === 0) {
            return
        }

        const fmt: string[] = []
        const newArgs: unknown[] = []
        const tailArgs: unknown[] = []

        for (let i = 0; i < args.length; i++) {
            let c = args[i]

            if (typeof c === 'string') {
                fmt.push('%s ')
                if (isHexString(c)) {
                    c = shortenHexString(c)
                }
                newArgs.push(c)
            } else if (typeof c === 'object' && c !== null) {
                if (c instanceof Error) {
                    tailArgs.push('\n')
                    tailArgs.push(c)
                } else {
                    fmt.push('%O\n')
                    newArgs.push(cloneAndFormat(c))
                }
            } else {
                fmt.push('%O ')
                newArgs.push(c)
            }
        }

        d(fmt.join(''), ...newArgs, ...tailArgs)
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
        set: (v: boolean) => (d.enabled = v),
    })

    return dlog as DLogger
}

export function isJest(): boolean {
    return isNode && (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined)
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

/**
 * Same as dlog, but logger is bound to console.error so clicking on it expands log site callstack (in addition to printed error callstack).
 * Also, logger is enabled by default, except if running in jest.
 *
 * @param ns Namespace for the logger.
 * @returns New logger with namespace `ns`.
 */
export const dlogError = (ns: string): DLogger => {
    const l = makeDlog(debug(ns))
    l.enabled = l.enabled || !isJest()
    // eslint-disable-next-line no-console
    l.baseDebug.log = console.error.bind(console)
    return l
}
