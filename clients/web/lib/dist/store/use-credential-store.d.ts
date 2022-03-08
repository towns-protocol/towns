export declare type CredentialStoreStates = {
    accessToken: string | null;
    setAccessToken: (accessToken: string | undefined) => void;
};
export declare const useCredentialStore: import("zustand").UseBoundStore<CredentialStoreStates, import("zustand").StoreApi<CredentialStoreStates>>;
