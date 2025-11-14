import { bin_toHexString, isHexString, shortenHexString } from './binary'
import debug, { Debugger } from 'debug'

import { isTestEnv } from './utils'
import { safeEnv } from './envUtils'

// Works as debug.enabled, but falls back on options if not explicitly set in env instead of returning false.
debug.enabled = (ns: string): boolean => {
    if (ns.length > 0 && ns[ns.length - 1] === '*') {
        return true
    }

    for (const s of debug.skips) {
        if (s instanceof RegExp) {
            // users are complining that s.test is not a function in some cases
            if (s.test(ns)) {
                return false
            }
        }
    }

    for (const s of debug.names) {
        if (s instanceof RegExp) {
            if (s.test(ns)) {
                // users are complining that s.test is not a function in some cases
                return true
            }
        }
    }

    const opts = allDlogs.get(ns)?.opts
    if (opts !== undefined) {
        if (!opts.allowJest && isTestEnv()) {
            return false
        } else {
            return opts.defaultEnabled ?? false
        }
    }

    return false
}

// Set namespaces to empty string if not set so debug.enabled() is called and can retrieve defaultEnabled from options.
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if ((debug as any).namespaces === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    ;(debug as any).namespaces = ''
}

const MAX_CALL_STACK_SZ = 18

const hasOwnProperty = <Y extends PropertyKey>(obj: object, prop: Y): obj is Record<Y, unknown> => {
    return Object.prototype.hasOwnProperty.call(obj, prop)
}

export const cloneAndFormat = (obj: unknown, opts?: { shortenHex?: boolean }): unknown => {
    return _cloneAndFormat(obj, 0, new WeakSet(), opts?.shortenHex === true)
}

const _cloneAndFormat = (
    obj: unknown,
    depth: number,
    seen: WeakSet<object>,
    shorten: boolean,
): unknown => {
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
        return isHexString(obj) && shorten ? shortenHexString(obj) : obj
    }

    if (obj instanceof Uint8Array) {
        return shorten ? shortenHexString(bin_toHexString(obj)) : bin_toHexString(obj)
    }

    if (obj instanceof BigInt || typeof obj === 'bigint') {
        return obj.toString()
    }

    if (Array.isArray(obj)) {
        return obj.map((e) => _cloneAndFormat(e, depth + 1, seen, shorten))
    }

    if (typeof obj === 'object' && obj !== null) {
        if (obj instanceof Error) {
            return obj.stack || obj.message
        }

        if (typeof (obj as Iterable<unknown>)[Symbol.iterator] === 'function') {
            // Iterate over values of Map, Set, etc.
            const newObj = []
            for (const e of obj as any) {
                newObj.push(_cloneAndFormat(e, depth + 1, seen, shorten))
            }
            return newObj
        }

        const newObj: Record<PropertyKey, unknown> = {}
        for (const key in obj) {
            if (hasOwnProperty(obj, key)) {
                let newKey = key
                if (typeof key === 'string' && isHexString(key) && shorten) {
                    newKey = shortenHexString(key)
                }
                if (key == 'emitter') {
                    newObj[newKey] = '[emitter]'
                } else {
                    newObj[newKey] = _cloneAndFormat(obj[key], depth + 1, seen, shorten)
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
    opts?: DLogOpts
}

export interface DLogOpts {
    // If true, logger is enabled by default, unless explicitly disabled by DEBUG=-logger_name.
    defaultEnabled?: boolean

    // If true, defaultEnabled is used under jest. Otherwise defaults to false.
    allowJest?: boolean

    // If true, binds to console.error so callstack is printed.
    printStack?: boolean

    // If true, logs will be logged to console.warn instead of console.log
    warn?: boolean
}

const allDlogs: Map<string, DLogger> = new Map()

// Configurable error logger - evaluated at runtime to avoid order of operations issues
let customInfoLogger: ((...args: unknown[]) => void) | undefined = undefined
let customErrorLogger: ((...args: unknown[]) => void) | undefined = undefined
let customWarnLogger: ((...args: unknown[]) => void) | undefined = undefined

/**
 * Set a custom error logger that will be used instead of console.error for dlog error output.
 * This allows external libraries to capture and buffer error logs for reporting.
 *
 * @param logger Custom logger function, or undefined to reset to console.error
 */
export const setDlogErrorLogger = (logger: ((...args: unknown[]) => void) | undefined): void => {
    customErrorLogger = logger
}

/**
 * Set a custom warning logger that will be used instead of console.warn for dlog warning output.
 * This allows external libraries to capture and buffer warning logs for reporting.
 *
 * @param logger Custom logger function, or undefined to reset to console.warn
 */
export const setDlogWarnLogger = (logger: ((...args: unknown[]) => void) | undefined): void => {
    customWarnLogger = logger
}

/**
 * Set a custom info logger that will be used instead of console.log for dlog info output.
 * This allows external libraries to capture and buffer info logs for reporting.
 *
 * @param logger Custom logger function, or undefined to reset to console.log
 */
export const setDlogInfoLogger = (logger: ((...args: unknown[]) => void) | undefined): void => {
    customInfoLogger = logger
}

// github#722
const isSingleLineLogsMode = safeEnv(['SINGLE_LINE_LOGS']) === 'true'

const makeDlog = (d: Debugger, opts?: DLogOpts): DLogger => {
    if (opts?.warn) {
        d.log = (...args: unknown[]) => {
            const warnLogger = customWarnLogger || console.warn
            warnLogger(...args)
        }
    }
    if (opts?.warn !== true && opts?.printStack) {
        // Use a dynamic logger that checks for custom error logger at runtime
        d.log = (...args: unknown[]) => {
            const errorLogger = customErrorLogger || console.error
            errorLogger(...args)
        }
    }

    if (opts?.warn !== true && opts?.printStack !== true && opts?.defaultEnabled) {
        d.log = (...args: unknown[]) => {
            const infoLogger = customInfoLogger || console.log
            infoLogger(...args)
        }
    }

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
                    if (isSingleLineLogsMode) {
                        fmt.push('%o\n')
                    } else {
                        fmt.push('%O\n')
                    }
                    tailArgs.push(c)
                } else {
                    if (isSingleLineLogsMode) {
                        fmt.push('%o\n')
                    } else {
                        fmt.push('%O\n')
                    }
                    newArgs.push(cloneAndFormat(c, { shortenHex: true }))
                }
            } else {
                if (isSingleLineLogsMode) {
                    fmt.push('%o ')
                } else {
                    fmt.push('%O ')
                }
                newArgs.push(c)
            }
        }

        d(fmt.join(''), ...newArgs, ...tailArgs)
    }

    dlog.baseDebug = d
    dlog.namespace = d.namespace
    dlog.opts = opts

    dlog.extend = (sub: string, delimiter?: string): DLogger => {
        return makeDlog(d.extend(sub, delimiter), opts)
    }

    Object.defineProperty(dlog, 'enabled', {
        enumerable: true,
        configurable: false,
        get: () => d.enabled,
        set: (v: boolean) => (d.enabled = v),
    })

    allDlogs.set(d.namespace, dlog as DLogger)
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
export const dlog = (ns: string, opts?: DLogOpts): DLogger => {
    return makeDlog(debug(ns), opts)
}

/**
 * Same as dlog, but logger is bound to console.error so clicking on it expands log site callstack (in addition to printed error callstack).
 * Also, logger is enabled by default, except if running in jest.
 *
 * @param ns Namespace for the logger.
 * @returns New logger with namespace `ns`.
 */
export const dlogError = (ns: string): DLogger => {
    const l = makeDlog(debug(ns), { defaultEnabled: true, printStack: true, allowJest: true })
    return l
}

/**
 * Same as dlog, but logger is bound to console.warn so clicking on it expands log site callstack.
 * Also, logger is enabled by default, except if running in jest.
 *
 * @param ns Namespace for the logger.
 * @returns New logger with namespace `ns`.
 */
export const dlogWarn = (ns: string): DLogger => {
    return makeDlog(debug(ns), { defaultEnabled: true, allowJest: true, warn: true })
}

export interface ExtendedLogger {
    info: DLogger
    log: DLogger
    error: DLogger
    warn: DLogger
    extend: (namespace: string) => ExtendedLogger
}

/**
 * Create complex logger with multiple levels
 * @param ns Namespace for the logger.
 * @returns New logger with log/info/error namespace `ns`.
 */
export const dlogger = (ns: string): ExtendedLogger => {
    return {
        log: makeDlog(debug(ns + ':log')),
        info: makeDlog(debug(ns + ':info'), { defaultEnabled: true, allowJest: true }),
        error: dlogError(ns + ':error'),
        warn: dlogWarn(ns + ':warn'),
        extend: (sub: string) => {
            return dlogger(ns + ':' + sub)
        },
    }
}
