import { Address } from 'wagmi'
import { create, StateCreator } from 'zustand'
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware'

export type MatrixCredentials = {
    accessToken: string
    deviceId: string
    userId: string
    username?: string
    loggedInWalletAddress: Address
}

export type CasablancaCredentials = {
    // TODO(HNT-1380): replace with function, so if object is logged, private key is not printed.
    privateKey: string
    creatorAddress: string
    delegateSig?: string
    deviceId?: string
    loggedInWalletAddress: Address
}

export type CredentialStoreStates = {
    matrixCredentialsMap: Record<string, MatrixCredentials | null>
    setMatrixCredentials: (
        homeServerUrl: string,
        matrixCredentials: MatrixCredentials | null,
    ) => void
    casablancaCredentialsMap: Record<string, CasablancaCredentials | null>
    setCasablancaCredentials: (
        homeServerUrl: string,
        casablancaCredentials: CasablancaCredentials | null,
    ) => void
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
            matrixCredentialsMap: {},
            setMatrixCredentials: (
                homeServerUrl: string,
                matrixCredentials: MatrixCredentials | null,
            ) =>
                set((state) => ({
                    ...state,
                    matrixCredentialsMap: {
                        ...state.matrixCredentialsMap,
                        [homeServerUrl]: matrixCredentials,
                    },
                })),
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
        }),
        {
            name: CREDENTIAL_STORE_NAME,
            storage: createJSONStorage(() => localStorage),
            version: 1,
        },
    ),
)
