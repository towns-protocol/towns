import { toJson } from './utils'

export enum ErrorCode {
    BAD_REQUEST = 'BAD_REQUEST',
    INVALID_USER_OPERATION = 'INVALID_USER_OPERATION',
    DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',
    HAS_MEMBERSHIP_TOKEN = 'HAS_MEMBERSHIP_TOKEN',
    INVALID_PAYMASTER_RESPONSE = 'INVALID_PAYMASTER_RESPONSE',
    INVALID_PRIVY_AUTH_TOKEN = 'INVALID_PRIVY_AUTH_TOKEN',
    INVALID_PRIVY_RESPONSE = 'INVALID_PRIVY_RESPONSE',
    INVALID_ROOT_KEY = 'INVALID_ROOT_KEY',
    INVALID_SENDER = 'INVALID_SENDER',
    INVALID_SPACE = 'INVALID_SPACE',
    INVALID_WHITELISTED_EMAIL = 'INVALID_WHITELISTED_EMAIL',
    INVALID_WHITELISTED_SPACE = 'INVALID_WHITELISTED_SPACE',
    INVALID_WHITELISTED_WALLET = 'INVALID_WHITELISTED_WALLET',
    MAX_SUPPLY_ZERO = 'MAX_SUPPLY_ZERO',
    MEMBERSHIP_LIMIT_REACHED = 'MEMBERSHIP_LIMIT_REACHED',
    MISSING_ENV_VARIABLE = 'MISSING_ENV_VARIABLE',
    NOT_FOUND = 'NOT_FOUND',
    PAID_SPACE = 'PAID_SPACE',
    PAYMASTER_ERROR = 'PAYMASTER_ERROR',
    PAYMASTER_LIMIT_REACHED = 'PAYMASTER_LIMIT_REACHED',
    QUERY_ERROR = 'QUERY_ERROR',
    SPACE_DISABLED_FOR_PAYMASTER = 'SPACE_DISABLED_FOR_PAYMASTER',
    TRANSACTION_NOT_SUPPORTED = 'TRANSACTION_NOT_SUPPORTED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    UNKNOWN_OPERATION = 'UNKNOWN_OPERATION',
}

type ApiResponse<T> = {
    success: boolean
    message: string
    errorDetail?: ApiErrorDetail
    data?: T
}

export type ApiErrorDetail = {
    code: ErrorCode // Application-specific error code (e.g., "VALIDATION_ERROR")
    description: string // Description of the error for developers
}

export function createSuccessResponse<T>(status: number, message: string, data?: T) {
    return new Response(
        toJson({
            success: true,
            message,
            data,
            /**
             * @deprecated
             * backwards compatibility for fields added directly in response
             * clients should migrate to data field
             */
            ...data,
        } satisfies ApiResponse<T>),
        {
            status,
        },
    )
}

export function createErrorResponse(status: number, message: string, code: ErrorCode) {
    return new Response(
        toJson({
            success: false,
            message,
            errorDetail: {
                code,
                description: message,
            },
            /**
             * @deprecated
             * backwards compatibility for old error string
             * clients should migrate to errorDetail field
             */
            error: message,
        } satisfies ApiResponse<null> & { error: string }),
        {
            status,
        },
    )
}
