import { JSONRPCErrorException } from 'json-rpc-2.0'
import { Err } from './err'

export function throwWithCode(message?: string, code?: Err, data?: any): never {
    throw new JSONRPCErrorException(message ?? 'Unknown', code ?? Err.UNKNOWN, data)
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
