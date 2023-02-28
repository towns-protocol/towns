import { create } from 'zustand'

export const useUploadImageStore = create<{
    renderKeys: { [x: string]: number }
    enabledSpaces: { [x: string]: boolean }
    hasUploadRetryBehavior: boolean
    setUploadRetryBehavior: (hasUploadRetryBehavior: boolean) => void
    setRenderKey: (spaceId: string) => void
    setEnabled: (spaceId: string, enabled: boolean) => void
}>((set) => ({
    renderKeys: {},
    enabledSpaces: {},
    hasUploadRetryBehavior: false,
    setUploadRetryBehavior: (hasUploadRetryBehavior: boolean) => set({ hasUploadRetryBehavior }),
    setEnabled: (spaceId: string, enabled: boolean) =>
        set((state) => ({ enabledSpaces: { ...state.enabledSpaces, [spaceId]: enabled } })),
    setRenderKey: (spaceId) =>
        set((state) => ({ renderKeys: { ...state.renderKeys, [spaceId]: Date.now() } })),
}))
