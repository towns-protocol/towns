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
    privateKey: string
    creatorAddress: Uint8Array
    delegateSig?: Uint8Array
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
            name: 'credential-store',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
