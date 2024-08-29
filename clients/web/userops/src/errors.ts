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

// https://docs.stackup.sh/docs/bundler-errors
// docs.alchemy.com/reference/bundler-api-errors
export function matchGasTooLowError(error: unknown) {
    const err = errorToCodeException(error, 'misc')
    // alchemy
    if (err.code.toString().startsWith('-32')) {
        const possibleGasErrors = [
            'maxFeePerGas',
            'callGasLimit',
            // maxFeePerGas or preVerificationGas too low
            'preVerificationGas',
            'maxPriorityFeePerGas',
            // verificationGasLimit too low
            'AA23 reverted',
            // verificationGasLimit too low
            'OOG',
        ]
        const match = possibleGasErrors.find((error) => err.message.includes(error))
        if (match) {
            return match
        }
    }
    // stackup
    const isPreVerificationGasBelowExpected =
        err.code === -32602 &&
        typeof err.data === 'string' &&
        err.data.includes('preVerificationGas: below expected gas')
    if (isPreVerificationGasBelowExpected) {
        return 'preVerificationGas'
    }
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
                return new CodeException({
                    message: parsedData.message ?? err?.message ?? 'Unknown error',
                    code: parsedData.code,
                    data: parsedData.data,
                    category,
                })
            } catch (error) {
                // ignore
                console.error('[errorToCodeException] failed to parse error', error)
            }
        }
    }

    return new CodeException({
        message: err?.message ?? 'Unknown error',
        code: err.code,
        // alchemy might nest in revertData
        data: (err.data as { revertData: unknown })?.revertData ?? err.data ?? null,
        category,
    })
}
