/*
  Error types and utilities
*/

// ethers.Signer must be defined to sign blockchain transactions
export class SignerUndefinedError extends Error {
    constructor(message?: string) {
        super(message ?? 'Signer is undefined')
        this.name = 'SignerUndefined'
    }
}

export class WalletDoesNotMatchSignedInAccountError extends Error {
    constructor(message?: string) {
        super(message ?? 'Current wallet does not match the signed in account')
        this.name = 'CurrentWalletNotEqualToLoggedInWallet'
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toError(error: any): Error {
    if (error instanceof Error) {
        return error
    }
    return new Error(JSON.stringify(error))
}

export class MembershipRejectedError extends Error {
    constructor(message?: string) {
        super(message ?? 'Membership rejected')
        this.name = 'MembershipRejected'
    }
}

type ErrorCategory = 'river' | 'userop'

/**
 * Adds an category to an error object
 */
export function addCategoryToError<T>(error: T, category: ErrorCategory) {
    const existingErrorCategory = getErrorCategory(error)

    if (typeof error === 'object' && error !== null) {
        Object.assign(error, { category: existingErrorCategory ?? category })
    }
}

function isErrorWithCategory(error: unknown): error is Error & { category: ErrorCategory } {
    if (typeof error === 'object' && error !== null) {
        return 'category' in error
    }
    return false
}

export function getErrorCategory(error: unknown) {
    if (isErrorWithCategory(error)) {
        return error.category
    }
}

export function addCategoryToErrorIfNotExists<T>(error: T, category: ErrorCategory) {
    return addCategoryToError(error, getErrorCategory(error) ?? category)
}
