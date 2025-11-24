import axios, { AxiosError } from 'axios'

export type HttpErrorType = 'TIMEOUT' | `HTTP_${number}` | 'NETWORK_ERROR' | 'UNKNOWN_ERROR'

export interface HttpError {
    type: HttpErrorType
    message: string
    originalError: Error
}

/**
 * Classifies an error from an HTTP request into a diagnostic type
 */
export function classifyHttpError(error: unknown): HttpError {
    const err = error as Error

    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError

        // Timeout errors
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
            return {
                type: 'TIMEOUT',
                message: axiosError.message,
                originalError: err,
            }
        }

        // HTTP status errors
        if (axiosError.response) {
            return {
                type: `HTTP_${axiosError.response.status}`,
                message: axiosError.message,
                originalError: err,
            }
        }

        // Network errors (DNS, connection refused, etc.)
        return {
            type: 'NETWORK_ERROR',
            message: axiosError.code || axiosError.message,
            originalError: err,
        }
    }

    // Unknown error type
    return {
        type: 'UNKNOWN_ERROR',
        message: err instanceof Error ? err.message : String(error),
        originalError: err,
    }
}

export interface FetchOptions {
    timeout?: number
    maxRetries?: number
    retryDelayMs?: number
    logPrefix?: string
}

/**
 * Fetch JSON data with automatic retries and enhanced error logging
 */
export async function fetchJson<T>(uri: string, options: FetchOptions = {}): Promise<T | null> {
    const {
        timeout = 5000,
        maxRetries = 3,
        retryDelayMs = 1000,
        logPrefix = '[HttpClient]',
    } = options

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get<T>(uri, { timeout })

            if (response.status !== 200) {
                console.warn(
                    `${logPrefix} Non-200 status: ` +
                        `uri=${uri}, status=${response.status}, attempt=${attempt}/${maxRetries}`,
                )
            }

            // Success - log if this was a retry
            if (attempt > 1) {
                console.info(`${logPrefix} Fetch succeeded after ${attempt} attempts: uri=${uri}`)
            }

            return response.data
        } catch (error) {
            const httpError = classifyHttpError(error)

            if (attempt < maxRetries) {
                console.warn(
                    `${logPrefix} Fetch attempt ${attempt}/${maxRetries} failed: ` +
                        `uri=${uri}, errorType=${httpError.type}, message="${httpError.message}", ` +
                        `retryingIn=${retryDelayMs}ms`,
                )
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
            } else {
                console.error(
                    `${logPrefix} All ${maxRetries} fetch attempts exhausted: ` +
                        `uri=${uri}, errorType=${httpError.type}, message="${httpError.message}"`,
                )
            }
        }
    }

    return null
}
