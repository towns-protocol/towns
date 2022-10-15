import { Err } from './err';
export declare function throwWithCode(message?: string, code?: Err, data?: any): never;
/**
 * If not value, throws JSON RPC error with numberic error code, which is transmitted to the client.
 * @param value The value to check
 * @param message Error message to use if value is not valid
 * @param code JSON RPC error code to use if value is not valid
 * @param data Optional data to include in the error
 */
export declare function check(value: boolean, message?: string, code?: Err, data?: any): asserts value;
/**
 * Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
 * Always throws JSON RPC error.
 * @param value Switch value
 * @param message Error message
 * @param code JSON RPC error code
 * @param data Optional data to include in the error
 */
export declare function checkNever(value: never, message?: string, code?: Err, data?: any): never;
//# sourceMappingURL=check.d.ts.map