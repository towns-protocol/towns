import { Err } from '@towns/proto'
import { dlog } from './dlog'

const log = dlog('csb:error')

export class CodeException extends Error {
    code: number
    data?: any
    constructor(message: string, code: number, data?: any) {
        super(message)
        this.code = code
        this.data = data
    }
}

export function throwWithCode(message?: string, code?: Err, data?: any): never {
    const e = new CodeException(message ?? 'Unknown', code ?? Err.ERR_UNSPECIFIED, data)
    log('throwWithCode', e.message, e.stack)
    throw e
}

/**
 * If not value, throws JSON RPC error with numberic error code, which is transmitted to the client.
 * @param value The value to check
 * @param message Error message to use if value is not valid
 * @param code JSON RPC error code to use if value is not valid
 * @param data Optional data to include in the error
 */
export function check(value: boolean, message?: string, code?: Err, data?: any): asserts value {
    if (!value) {
        throwWithCode(message, code, data)
    }
}

/**
 * Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
 * Always throws JSON RPC error.
 * @param value Switch value
 * @param message Error message
 * @param code JSON RPC error code
 * @param data Optional data to include in the error
 */
export function checkNever(value: never, message?: string, code?: Err, data?: any): never {
    throwWithCode(
        message ?? `Unhandled switch value ${value}`,
        code ?? Err.INTERNAL_ERROR_SWITCH,
        data,
    )
}

export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null
}

interface Lengthwise {
    length: number
}

export function hasElements<T extends Lengthwise>(value: T | undefined | null): value is T {
    return isDefined(value) && value.length > 0
}
