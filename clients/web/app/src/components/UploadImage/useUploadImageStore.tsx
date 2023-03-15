import { create } from 'zustand'

type Resource = {
    renderKey: string
    temporaryImageUrl: string | undefined
}

export const useUploadImageStore = create<{
    resources: {
        [id: string]: Resource
    }
    setRenderKey: (resourceId: string, renderKey: string) => void
    setTemporaryImageUrl: (resourceId: string, url: string) => void
    setResource: (resourceId: string, resource: Resource) => void
}>((set) => ({
    resources: {},
    setResource: (resourceId, resource) => {
        set((state) => ({
            resources: {
                ...state.resources,
                [resourceId]: resource,
            },
        }))
    },
    setTemporaryImageUrl: (resourceId, temporaryImageUrl) => {
        set((state) => ({
            resources: {
                ...state.resources,
                [resourceId]: {
                    ...state.resources[resourceId],
                    temporaryImageUrl,
                },
            },
        }))
    },
    setRenderKey: (resourceId, url) => {
        set((state) => ({
            resources: {
                ...state.resources,
                [resourceId]: {
                    ...state.resources[resourceId],
                    renderKey: url,
                },
            },
        }))
    },
}))
