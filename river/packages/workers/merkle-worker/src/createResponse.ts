import { toJson } from './utils'
import { ApiSuccessResponse, ApiErrorResponse } from './types'

export enum ErrorCode {
    BAD_REQUEST = 'BAD_REQUEST',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    MERKLE_TREE_NOT_FOUND = 'MERKLE_TREE_NOT_FOUND',
    CLAIM_NOT_FOUND = 'CLAIM_NOT_FOUND',
    NOT_FOUND = 'NOT_FOUND',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    INVALID_PROOF = 'INVALID_PROOF',
}

export function createSuccessResponse<T>(status: number, message: string, data?: T) {
    return new Response(
        toJson({
            success: true,
            message,
            ...data,
        } satisfies ApiSuccessResponse<T>),
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
            error: message,
        } satisfies ApiErrorResponse),
        {
            status,
        },
    )
}
