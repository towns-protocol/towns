import { ethers } from 'ethers'
import isEqual from 'lodash/isEqual'
import { Address } from '../types/web3-types'
import { create, StateCreator } from 'zustand'
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware'
import { SignerContext } from '@river-build/sdk'
import { bin_fromHexString, bin_toHexString } from '@river-build/dlog'

export type CasablancaCredentials = {
    // TODO(HNT-1380): replace with function, so if object is logged, private key is not printed.
    privateKey: string
    creatorAddress: string
    delegateSig?: string
    loggedInWalletAddress: Address
}

export type CredentialStoreStates = {
    casablancaCredentialsMap: Record<string, CasablancaCredentials | null>
    setCasablancaCredentials: (
        homeServerUrl: string,
        casablancaCredentials: CasablancaCredentials | null,
    ) => void
    clearCasablancaCredentials: (homeServerUrl: string, old: CasablancaCredentials | null) => void
}

export function credentialsFromSignerContext(
    primaryWalletAddress: Address,
    delegateWallet: ethers.Wallet,
    casablancaContext: SignerContext,
): CasablancaCredentials {
    return {
        privateKey: delegateWallet.privateKey,
        creatorAddress: ethers.utils.getAddress(bin_toHexString(casablancaContext.creatorAddress)),
        delegateSig: casablancaContext.delegateSig
            ? bin_toHexString(casablancaContext.delegateSig)
            : undefined,
        loggedInWalletAddress: primaryWalletAddress,
    }
}

export function credentialsToSignerContext(credentials: CasablancaCredentials): SignerContext {
    const pk = credentials.privateKey.slice(2)
    const context: SignerContext = {
        signerPrivateKey: () => pk,
        creatorAddress: bin_fromHexString(credentials.creatorAddress),
        delegateSig: credentials.delegateSig
            ? bin_fromHexString(credentials.delegateSig)
            : undefined,
    }
    return context
}

type MyPersist = (
    config: StateCreator<CredentialStoreStates>,
    options: PersistOptions<CredentialStoreStates>,
) => StateCreator<CredentialStoreStates>

export const CREDENTIAL_STORE_NAME = 'towns/credentials'

export const useCredentialStore = create<CredentialStoreStates>(
    // John: This is a mere workaround (hack) typing the persist API to avoid
    // issue https://github.com/pmndrs/zustand/issues/650
    (persist as unknown as MyPersist)(
        (set) => ({
            casablancaCredentialsMap: {},
            setCasablancaCredentials: (
                homeServerUrl: string,
                casablancaCredentials: CasablancaCredentials | null,
            ) =>
                set((state) => ({
                    ...state,
                    casablancaCredentialsMap: {
                        ...state.casablancaCredentialsMap,
                        [homeServerUrl]: casablancaCredentials,
                    },
                })),
            clearCasablancaCredentials: (
                homeServerUrl: string,
                old: CasablancaCredentials | null,
            ) => {
                set((state) => {
                    if (isEqual(state.casablancaCredentialsMap[homeServerUrl], old)) {
                        state.casablancaCredentialsMap[homeServerUrl] = null
                    }
                    return state
                })
            },
        }),
        {
            name: CREDENTIAL_STORE_NAME,
            storage: createJSONStorage(() => localStorage),
            version: 1,
        },
    ),
)
