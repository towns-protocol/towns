import create, { SetState, StateCreator } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'

export type CredentialStoreStates = {
    accessToken: string | null
    setAccessToken: (accessToken: string | undefined) => void
}

type MyPersist = (
    config: StateCreator<CredentialStoreStates>,
    options: PersistOptions<CredentialStoreStates>,
) => StateCreator<CredentialStoreStates>

export const useCredentialStore = create<CredentialStoreStates>(
    // John: This is a mere workaround (hack) typing the persist API to avoid
    // issue https://github.com/pmndrs/zustand/issues/650
    (persist as unknown as MyPersist)(
        (set: SetState<CredentialStoreStates>) => ({
            accessToken: null,
            setAccessToken: (accessToken: string | undefined) =>
                set({ accessToken: accessToken ?? null }),
        }),
        {
            name: 'credential-store',
            getStorage: () => localStorage,
        },
    ),
)
