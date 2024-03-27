import { Err } from '@river-build/proto'
import { dlogError } from './dlog'

const log = dlogError('csb:error')

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
