import {
    SignerUndefinedError,
    WalletDoesNotMatchSignedInAccountError,
    useCasablancaStore,
} from 'use-towns-client'

import { WalletAlreadyLinkedError, WalletNotLinkedError } from '@river-build/web3'

import {
    ENTITLEMENT_NOT_ALLOWED,
    ERROR_GATE_FACET_SERVICE_NOT_ALLOWED,
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
} from '@components/Web3/constants'
import { trackError } from 'hooks/useAnalytics'

export const EVERYONE_ADDRESS = '0x0000000000000000000000000000000000000001'
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export function isEveryoneAddress(address: string): boolean {
    return address === EVERYONE_ADDRESS
}

export function isEthAddress(address: string): boolean {
    return address === ETH_ADDRESS
}

export function formatEthDisplay(num: number) {
    let formatted = num.toFixed(5)
    formatted = formatted.replace(/(\.\d*?[1-9])0+$/, '$1')
    formatted = formatted.replace(/(\.0*?)$/, '')
    return formatted
}

const walletLinkError = new WalletAlreadyLinkedError()
const walletNotLinkedError = new WalletNotLinkedError()

type AuthError = ReturnType<(typeof useCasablancaStore)['getState']>['authError']
type ErrorTypes = (Error | AuthError) & { category?: string }

/**
 * Blockchain, River, and other errors might be passed in during a transaction.
 * This function attempts to map the error to a user-friendly error message.
 */
export function mapToErrorMessage(args: {
    error: ErrorTypes | undefined
    source: string | undefined
}): string | undefined {
    const { error, source } = args
    if (!error) {
        return 'An unknown error occurred. Cannot save transaction.'
    }

    const errorCode = getErrorCode(error)

    if (errorCode === 'ACTION_REJECTED' || errorCode === 4001 || isRejectedErrorMessage(error)) {
        return
    }

    // category is used for analytics tracking purposes
    const category = getErrorCategory(error)
    const { errorText: errorDisplayText, errorName } = getErrorDisplayText(error)

    const errorTracking = {
        error,
        code: errorCode,
        name: errorName,
        displayText: errorDisplayText,
        category,
        source,
    }

    // for now let's only track errors with a source
    if (source) {
        trackError(errorTracking)
    }

    console.error('[mapToErrorMessage]', errorTracking)

    return errorDisplayText
}

function getErrorDisplayText(error: ErrorTypes | undefined) {
    let errorText = ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorName = getErrorName(error)
    const errorCode = getErrorCode(error)

    // TODO for https://linear.app/hnt-labs/issue/HNT-8398/user-friendly-error-messaging
    // leverage the category to provide an ultimate fallback error message for 2 buckets
    // discuss w/ Fei about adding a non-obtrusive error code to the displayed notification
    // so at a quick glance or screenshot, a dev can determine the general category of the error
    // alternative, instead of display `T0`, could display `userop` or `river`?
    // 1. userops - T0
    // 2. river - T1
    // in addition to retaining the error subtext

    if (error) {
        switch (true) {
            case isRiverTimeouError(error):
                errorText = error.message
                break
            case isNotFoundRiverError(error):
                errorText = 'River stream not found.'
                break
            case isLimitReachedError(error):
                errorText = 'This town has reached its member limit.'
                break
            case isMaybeFundsError(error):
                errorText =
                    'You may have insufficient funds in your wallet. Please check your wallet and try again.'
                break
            case errorName === walletLinkError.name:
                errorText = 'Wallet is already linked.'
                break
            case errorName === walletNotLinkedError.name:
                errorText = 'Wallet is not linked.'
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
            case errorName === ENTITLEMENT_NOT_ALLOWED:
                errorText = 'Not entitled to perform this action.'
                break
            case errorName === ERROR_GATE_FACET_SERVICE_NOT_ALLOWED:
                errorText =
                    'Not allowed to create town. Your wallet may contain insufficient funds.'
                break
            default:
                if (errorName) {
                    errorText = `${errorName}`
                }
                if (errorCode) {
                    errorText = `${errorText} ${errorCode}`
                }
                if (error.message) {
                    errorText = `${errorText} ${error.message}`
                }
                if (!errorText) {
                    errorText = 'An unknown error occurred.'
                }
                break
        }
    }

    return {
        errorName,
        errorText,
    }
}

function getErrorName(error: ErrorTypes | undefined): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorName = ((error as any)?.name || (error as any)?.error?.name) ?? ''
    return errorName
}

function getErrorCode(error: ErrorTypes | undefined): string | number {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = ((error as any)?.code || (error?.message as any)?.code) ?? 'unknown'
    return errorCode
}

// some river errors will return codes
// UserOperations class will throw errors with codes
// TownsClient should additionally add an category to the error object
// using these, we should be able to mostly categorize errors for analytics purposes
function getErrorCategory(error: ErrorTypes | undefined) {
    if (!error) {
        return 'unknown'
    }
    const errorCode = getErrorCode(error)
    let category: string | undefined
    if (error.category) {
        category = error.category
    }

    // in case an error was not categorized, we can try to categorize it based on the error code
    if (!category) {
        // river/core/protocol/protocl.pb.go
        if (typeof errorCode === 'number' && errorCode < 62) {
            category = 'river'
        } else if (
            // bundler errors are negative
            (typeof errorCode === 'number' && errorCode < 0) ||
            // entrypoint errors are AAxxx
            errorCode.toString().startsWith('AA') ||
            // Useroperations class might throw these errors
            errorCode.toString().toLowerCase().includes('userops') ||
            errorCode.toString().toLowerCase().includes('user_ops')
        ) {
            category = 'userop'
        }
    }

    if (!category) {
        category = 'misc'
    }
    return category
}

function isRiverTimeouError(error: ErrorTypes | undefined) {
    return error?.message?.toString()?.toLowerCase()?.includes('timed out waiting for event')
}

function isNotFoundRiverError(error: ErrorTypes | undefined) {
    const _error = error as unknown as { code: number; message: string }
    return _error?.code === 5 && _error.message.includes('5:NOT_FOUND')
}

export function isLimitReachedError(error: ErrorTypes | undefined) {
    return error?.message?.includes?.('has exceeded the member cap')
}

export function isMaybeFundsError(error: ErrorTypes | undefined) {
    return error?.message?.toString()?.includes('gas required exceeds allowance (0)')
}

function isRejectedErrorMessage(error: ErrorTypes | undefined) {
    return error?.message?.toString()?.includes('user rejected transaction')
}

export function baseScanUrl(chainId: number) {
    switch (chainId) {
        case 31337: // just for complete url, doesn't apply to foundry
        case 84532:
            return 'https://sepolia-explorer.base.org'
        default:
            return 'https://basescan.org'
    }
}

export function openSeaAssetUrl(chainId: number, contractAddress: string) {
    switch (chainId) {
        case 31337: // just for complete url, doesn't apply to foundry
        case 84532:
            return `https://testnets.opensea.io/assets/base-sepolia/${contractAddress}`
        default:
            return `https://opensea.io/assets/base/${contractAddress}`
    }
}

export const openSeaBaseAssetUrl = 'https://opensea.io/assets/base'
