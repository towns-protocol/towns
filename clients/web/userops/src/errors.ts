export const errorCategories = {
    userop_sponsored: 'userop_sponsored',
    userop_non_sponsored: 'userop_non_sponsored',
    userop: 'userop',
    misc: 'misc',
    privy: 'privy',
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

// Privy seems to misbehave and throw "Unknown connector error" when requesting another signature too quickly!!
// This can happen on initial login from a public town page, when a user logs in with embedded wallet, other signature requests might come in (i.e. sign for river delegate key, sign for setting up userops, etc.)
// It will also happen when https://auth.privy.io/api/v1/embedded_wallets/<address>/* fails
// https://hntlabs.slack.com/archives/C05SSQJMK0V/p1723649868311309
export function matchPrivyUnknownConnectorError(error: unknown):
    | {
          error: CodeException
      }
    | undefined {
    const err = errorToCodeException(error, 'privy')
    if (err.message.includes('Unknown connector error')) {
        return { error: err }
    }
}

// https://docs.stackup.sh/docs/bundler-errors
// docs.alchemy.com/reference/bundler-api-errors
export function matchGasTooLowError(error: unknown):
    | {
          error: CodeException
          type: string
      }
    | undefined {
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
            // replacement underpriced
            'currentMaxPriorityFee',
            'currentMaxFee',
        ]
        const match = possibleGasErrors.find((error) => err.message.includes(error))
        if (match) {
            return { error: err, type: match }
        }
    }
    // stackup
    const isPreVerificationGasBelowExpected =
        err.code === -32602 &&
        typeof err.data === 'string' &&
        err.data.includes('preVerificationGas: below expected gas')
    if (isPreVerificationGasBelowExpected) {
        return { error: err, type: 'preverificationGas' }
    }
}

export function errorToCodeException(error: unknown, category: ErrorCategory) {
    if (!isError) {
        return new CodeException({
            message: 'Unknown error',
            code: '',
            data: null,
            category,
        })
    }

    const err = error as {
        message?: string
        reason?: string
        code?: number | string
        data?: unknown
    }

    const reason = err?.message || err?.reason

    if (typeof reason === 'string') {
        // matching something like:
        // {"error":"{\"code\":-32602,\"message\":\"preVerificationGas: below expected gas\",\"data\":{\"revertData\":null}}"}
        const errorMatch = reason?.match(/error\\":\{([^}]+)\}/)?.[1]
        if (errorMatch) {
            // Update the makeCodeException function
            const makeCodeException = (parsedData: unknown): CodeException => {
                if (!isParsedErrorData(parsedData)) {
                    throw new Error('failed isParsedErrorData')
                }

                return new CodeException({
                    message: parsedData.message ?? 'Unknown error',
                    code: parsedData.code ?? '',
                    data:
                        (containsRevertData(parsedData.data)
                            ? parsedData.data.revertData
                            : parsedData.data) ?? null,
                    category,
                })
            }

            try {
                const parsedData = JSON.parse(`{${errorMatch?.replace(/\\/g, '')}}`)
                return makeCodeException(parsedData)
            } catch (error) {
                try {
                    // if nested in revertData, needs an extra curly brace to be valid JSON
                    const parsedData = JSON.parse(`{${errorMatch?.replace(/\\/g, '')}}}`)
                    return makeCodeException(parsedData)
                } catch (error) {
                    console.error('[errorToCodeException] failed to parse error', error)
                }
            }
        }
    }

    return new CodeException({
        message: err.message ?? 'Unknown error',
        code: err.code ?? '',
        // alchemy might nest in revertData
        data: (containsRevertData(err.data) ? err.data.revertData : err.data) ?? null,
        category,
    })
}

type ParsedErrorData = {
    message: string | undefined
    code: number | string | undefined
    data?:
        | {
              revertData?: unknown
          }
        | unknown
}

function isParsedErrorData(parsedData: unknown): parsedData is ParsedErrorData {
    return (
        typeof parsedData === 'object' &&
        parsedData !== null &&
        'message' in parsedData &&
        'data' in parsedData &&
        'code' in parsedData
    )
}

function containsRevertData(data: unknown): data is { revertData: unknown } {
    return typeof data === 'object' && data !== null && 'revertData' in data
}

function isError(error: unknown): error is Error {
    return (
        error !== null &&
        typeof error === 'object' &&
        'message' in error &&
        typeof (error as Error).message === 'string'
    )
}
