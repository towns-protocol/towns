import {
    SignerUndefinedError,
    TokenEntitlementStruct,
    WalletDoesNotMatchSignedInAccountError,
} from 'use-zion-client'

import { WalletAlreadyLinkedError, WalletNotLinkedError } from '@river/web3'

import {
    ENTITLEMENT_NOT_ALLOWED,
    ERROR_GATE_FACET_SERVICE_NOT_ALLOWED,
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
} from '@components/Web3/constants'

// Evan TODO: pass tokenIds too
// TBD if we need other params, they can be added one at a time
export function createTokenEntitlementStruct({
    contractAddress,
    tokenIds,
}: {
    contractAddress: string
    tokenIds?: number[]
}): TokenEntitlementStruct {
    return {
        contractAddress,
        isSingleToken: false,
        quantity: 1,
        tokenIds: tokenIds ?? [],
    }
}

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

export function mapToErrorMessage(error: Error | undefined) {
    if (!error) {
        return 'An unknown error occurred. Cannot save transaction.'
    }
    let errorText = ''
    const errorName = error?.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = (error?.message as any)?.code ?? ''

    switch (true) {
        case isNotFoundRiverError(error):
            errorText = 'River stream not found.'
            break
        case errorCode === 'ACTION_REJECTED' || isRejectedErrorMessage(error):
            errorText = 'Transaction rejected.'
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
            errorText = 'Not allowed to create town. Your wallet may contain insufficient funds.'
            break
        default:
            errorText = 'An unknown error occurred. Cannot save transaction.'
            break
    }
    const fullErrorText = `Transaction error: ${errorText}`

    return fullErrorText
}

export function isNotFoundRiverError(error: Error | undefined) {
    const _error = error as unknown as { code: number; message: string }
    return _error?.code === 5 && _error.message.includes('5:NOT_FOUND')
}

export function isLimitReachedError(error: Error | undefined) {
    return error?.message?.includes?.('has exceeded the member cap')
}

export function isMaybeFundsError(error: Error | undefined) {
    return error?.message?.toString()?.includes('gas required exceeds allowance (0)')
}

export function isRejectedErrorMessage(error: Error | undefined) {
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

export const openSeaBaseAssetUrl = 'https://opensea.io/assets/base'
