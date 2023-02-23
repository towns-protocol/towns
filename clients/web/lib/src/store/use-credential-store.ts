import { create, StateCreator } from 'zustand'
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware'

export type MatrixCredentials = {
    accessToken: string
    deviceId: string
    userId: string
    username?: string
}

export type CredentialStoreStates = {
    matrixCredentialsMap: Record<string, MatrixCredentials | null>
    setMatrixCredentials: (
        homeServerUrl: string,
        matrixCredentials: MatrixCredentials | null,
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
        }),
        {
            name: 'credential-store',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
