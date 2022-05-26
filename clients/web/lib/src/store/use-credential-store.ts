import createStore, { SetState } from "zustand";

export type CredentialStoreStates = {
  accessToken: string | null;
  setAccessToken: (accessToken: string | undefined) => void;
};

export const useCredentialStore = createStore<CredentialStoreStates>(
  (set: SetState<CredentialStoreStates>) => ({
    accessToken: null,
    setAccessToken: (accessToken: string | undefined) =>
      set({ accessToken: accessToken ?? null }),
  }),
);
