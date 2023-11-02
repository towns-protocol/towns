import { SignerUndefinedError, WalletDoesNotMatchSignedInAccountError } from 'use-zion-client'
import {
    ERROR_GATE_FACET_SERVICE_NOT_ALLOWED,
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
} from '@components/Web3/CreateSpaceForm/constants'

export function mapToErrorMessage(error: Error | undefined) {
    if (!error) {
        return 'An unknown error occurred. Cannot save transaction.'
    }
    let errorText = ''
    const errorName = error?.name ?? ''

    switch (true) {
        case isLimitReachedError(error):
            errorText = 'This town has reached its member limit.'
            break
        case isMaybeFundsError(error):
            errorText =
                'You may have insufficient funds in your wallet. Please check your wallet and try again.'
            break
        case errorName === ERROR_NAME_CONTAINS_INVALID_CHARACTERS:
            errorText =
                'Space name contains invalid characters. Please update the space name and try again.'
            break
        case errorName === ERROR_NAME_LENGTH_INVALID:
            errorText =
                'The space name must be between 3 and 32 characters. Please update the space name and try again.'
            break
        case errorName === ERROR_SPACE_ALREADY_REGISTERED:
            errorText =
                'The space name is already registered. Please choose a different space name and try again.'
            break
        case errorName === ERROR_INVALID_PARAMETERS:
            errorText = 'The space name is invalid. Please try again.'
            break
        case error instanceof SignerUndefinedError:
            errorText = 'Wallet is not connected. Please connect your wallet and try again.'
            break
        case error instanceof WalletDoesNotMatchSignedInAccountError:
            errorText =
                'Current wallet is not the same as the signed in account. Please switch your wallet and try again.'
            break
        case errorName === ERROR_GATE_FACET_SERVICE_NOT_ALLOWED:
            errorText = 'Not allowed to create town. Your wallet may contain insufficient funds.'
            break
        default:
            errorText = 'An unknown error occurred. Cannot save transaction.'
            break
    }
    const fullErrorText = `Transaction error: ${errorText}`

    return fullErrorText
}

export function isLimitReachedError(error: Error | undefined) {
    return error?.message?.includes?.('has exceeded the member cap')
}

export function isMaybeFundsError(error: Error | undefined) {
    return error?.message?.toString()?.includes('cannot estimate gas')
}
