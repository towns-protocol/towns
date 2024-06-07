import { Err } from '@river-build/proto'
import { dlogError, throwWithCode } from '@river-build/dlog'

const log = dlogError('csb:error')

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

/**
 * Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled,
 * but you don't want to throw an error.
 * Typical place you wouldn't want to throw an error - when parsing a protobuf message on the client. The protocol may
 * have been updated on the server, but the client hasn't been updated yet. In this case, the client will receive a case
 * that they can't handle, but it shouldn't break other messages in the stream. If you throw in the middle of a loop processing events,
 * then lots of messages will appear lost, when you could have just gracefully handled a new case.
 * @param value Switch value
 * @param message Error message
 * @param code JSON RPC error code
 * @param data Optional data to include in the error
 */
export function logNever(value: never, message?: string): void {
    // eslint-disable-next-line no-console
    console.warn(message ?? `Unhandled switch value: ${value}`)
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

export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        const e = new Error(message)
        log('assertion failed: ', e)
        throw e
    }
}
