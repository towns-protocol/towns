import { create } from 'zustand'

export const useUploadImageStore = create<{
    renderKeys: { [x: string]: number }
    hasUploadRetryBehavior: boolean
    setUploadRetryBehavior: (hasUploadRetryBehavior: boolean) => void
    setRenderKey: (spaceId: string) => void
}>((set) => ({
    renderKeys: {},
    hasUploadRetryBehavior: false,
    setUploadRetryBehavior: (hasUploadRetryBehavior: boolean) => set({ hasUploadRetryBehavior }),
    setRenderKey: (spaceId) =>
        set((state) => ({ renderKeys: { ...state.renderKeys, [spaceId]: Date.now() } })),
}))
