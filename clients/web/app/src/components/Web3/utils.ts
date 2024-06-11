import {
    SignerUndefinedError,
    WalletDoesNotMatchSignedInAccountError,
    useCasablancaStore,
} from 'use-towns-client'

import { WalletAlreadyLinkedError, WalletNotLinkedError } from '@river-build/web3'

import { arbitrum, base, baseSepolia, mainnet, optimism } from 'viem/chains'
import {
    ENTITLEMENT_NOT_ALLOWED,
    ERROR_GATE_FACET_SERVICE_NOT_ALLOWED,
    ERROR_INVALID_PARAMETERS,
    ERROR_NAME_CONTAINS_INVALID_CHARACTERS,
    ERROR_NAME_LENGTH_INVALID,
    ERROR_SPACE_ALREADY_REGISTERED,
} from '@components/Web3/constants'

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
type ErrorTypes = Error | AuthError

export function mapToErrorMessage(error: ErrorTypes | undefined) {
    console.error('[mapToErrorMessage]: original error', error)
    if (!error) {
        return 'An unknown error occurred. Cannot save transaction.'
    }
    let errorText = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorName = ((error as any)?.name || (error as any)?.error?.name) ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorCode = ((error as any)?.code || (error?.message as any)?.code) ?? ''

    if (errorCode === 'ACTION_REJECTED' || errorCode === 4001 || isRejectedErrorMessage(error)) {
        return
    }

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
            errorText = 'Not allowed to create town. Your wallet may contain insufficient funds.'
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
    const fullErrorText = `${errorText}`

    return fullErrorText
}

export function isRiverTimeouError(error: ErrorTypes | undefined) {
    return error?.message?.toString()?.toLowerCase()?.includes('timed out waiting for event')
}

export function isNotFoundRiverError(error: ErrorTypes | undefined) {
    const _error = error as unknown as { code: number; message: string }
    return _error?.code === 5 && _error.message.includes('5:NOT_FOUND')
}

export function isLimitReachedError(error: ErrorTypes | undefined) {
    return error?.message?.includes?.('has exceeded the member cap')
}

export function isMaybeFundsError(error: ErrorTypes | undefined) {
    return error?.message?.toString()?.includes('gas required exceeds allowance (0)')
}

export function isRejectedErrorMessage(error: ErrorTypes | undefined) {
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

// TODO: supportedNftNetworks will be grabbed from river
export const supportedNftNetworks = [
    { vChain: mainnet, alchemyIdentifier: 'eth-mainnet' },
    { vChain: base, alchemyIdentifier: 'base-mainnet' },
    { vChain: arbitrum, alchemyIdentifier: 'arb-mainnet' },
    { vChain: optimism, alchemyIdentifier: 'opt-mainnet' },
    { vChain: baseSepolia, alchemyIdentifier: 'base-sepolia' },
] as const
