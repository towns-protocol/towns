export const errorCategories = {
    userop_sponsored: 'userop_sponsored',
    userop_non_sponsored: 'userop_non_sponsored',
    userop: 'userop',
    misc: 'misc',
} as const

export type ErrorCategory = keyof typeof errorCategories

export class CodeException extends Error {
    code: number | string
    data: unknown | undefined
    category: ErrorCategory
    constructor(args: {
        message: string
        code: number | string
        data?: unknown
        category: ErrorCategory
    }) {
        const { message, code, data, category } = args
        super(message)
        this.code = code
        this.data = data
        this.category = category
    }
}

function isStackupErrorObject(
    obj: unknown,
): obj is { code: number; message?: string; data: unknown } {
    return typeof obj === 'object' && obj !== null && 'code' in obj && 'data' in obj
}

// https://docs.stackup.sh/docs/bundler-errors
export function isPreverificationGasTooLowError(error: unknown) {
    const err = errorToCodeException(error, 'misc')
    return (
        err.code === -32602 &&
        typeof err.data === 'string' &&
        err.data.includes('preVerificationGas: below expected gas')
    )
}

export function errorToCodeException(error: unknown, category: ErrorCategory) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any
    const reason = err?.message || err?.reason
    if (typeof reason === 'string') {
        const errorMatch = reason?.match(/error\\":\{([^}]+)\}/)?.[1]
        if (errorMatch) {
            try {
                const parsedData = JSON.parse(`{${errorMatch?.replace(/\\/g, '')}}`)
                if (isStackupErrorObject(parsedData)) {
                    return new CodeException({
                        message: parsedData.message ?? err?.message ?? 'Unknown error',
                        code: parsedData.code,
                        data: parsedData.data,
                        category,
                    })
                }
            } catch (error) {
                // ignore
                console.error('[errorToCodeException] failed to parse error', error)
            }
        }
    }

    return new CodeException({
        message: err?.message ?? 'Unknown error',
        code: err?.code,
        data: err?.data,
        category,
    })
}
