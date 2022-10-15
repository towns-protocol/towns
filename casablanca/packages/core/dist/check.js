"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNever = exports.check = exports.throwWithCode = void 0;
const json_rpc_2_0_1 = require("json-rpc-2.0");
const err_1 = require("./err");
function throwWithCode(message, code, data) {
    throw new json_rpc_2_0_1.JSONRPCErrorException(message ?? 'Unknown', code ?? err_1.Err.UNKNOWN, data);
}
exports.throwWithCode = throwWithCode;
/**
 * If not value, throws JSON RPC error with numberic error code, which is transmitted to the client.
 * @param value The value to check
 * @param message Error message to use if value is not valid
 * @param code JSON RPC error code to use if value is not valid
 * @param data Optional data to include in the error
 */
function check(value, message, code, data) {
    if (!value) {
        throwWithCode(message, code, data);
    }
}
exports.check = check;
/**
 * Use this function in the default case of a exhaustive switch statement to ensure that all cases are handled.
 * Always throws JSON RPC error.
 * @param value Switch value
 * @param message Error message
 * @param code JSON RPC error code
 * @param data Optional data to include in the error
 */
function checkNever(value, message, code, data) {
    throwWithCode(message ?? `Unhandled switch value ${value}`, code ?? err_1.Err.INTERNAL_ERROR_SWITCH, data);
}
exports.checkNever = checkNever;
