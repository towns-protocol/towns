export class CodeException extends Error {
    code: number | string
    data: unknown | undefined
    constructor(message: string, code: number | string, data?: unknown) {
        super(message)
        this.code = code
        this.data = data
    }
}

function isStackupErrorObject(
    obj: unknown,
): obj is { code: number; message?: string; data: unknown } {
    return typeof obj === 'object' && obj !== null && 'code' in obj && 'data' in obj
}

// https://docs.stackup.sh/docs/bundler-errors
export function isPreverificationGasTooLowError(error: unknown) {
    const err = errorToCodeException(error)
    return (
        err.code === -32602 &&
        typeof err.data === 'string' &&
        err.data.includes('preVerificationGas: below expected gas')
    )
}

export function errorToCodeException(error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    const reason = err?.message || err?.reason
    if (typeof reason === 'string') {
        const errorMatch = reason?.match(/error\\":\{([^}]+)\}/)?.[1]
        if (errorMatch) {
            const parsedData = JSON.parse(`{${errorMatch?.replace(/\\/g, '')}}`)
            if (isStackupErrorObject(parsedData)) {
                return new CodeException(
                    parsedData.message ?? err?.message ?? 'Unknown error',
                    parsedData.code,
                    parsedData.data,
                )
            }
        }
    }
    return new CodeException(err?.message ?? 'Unknown error', err?.code, err?.data)
}
