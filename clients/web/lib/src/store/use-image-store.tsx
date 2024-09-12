import { create } from 'zustand'

type Resource = {
    imageUrl: string | undefined
}

// this store managese loaded and failed image resources
export const useImageStore = create<{
    // TODO: we can clean this up into a single resource object with a status
    loadedResource: {
        [id: string]: Resource
    }
    erroredResources: {
        [id: string]: boolean
    }
    addErroredResource: (resourceId: string) => void
    removeErroredResource: (resourceId: string) => void
    setLoadedResource: (resourceId: string, resource: Resource) => void
    removeLoadedResource: (resourceId: string) => void
}>((set) => ({
    loadedResource: {},
    erroredResources: {},
    addErroredResource: (resourceId) => {
        set((state) => {
            if (state.erroredResources[resourceId]) {
                return state
            }
            return {
                erroredResources: {
                    ...state.erroredResources,
                    [resourceId]: true,
                },
            }
        })
    },
    removeErroredResource: (resourceId) => {
        set((state) => {
            //multiple image variants could have failed, remove them all
            const errors = { ...state.erroredResources }
            Object.keys(errors).forEach((key) => {
                if (key.startsWith(resourceId)) {
                    delete errors[key]
                }
            })

            return {
                erroredResources: errors,
            }
        })
    },
    setLoadedResource: (resourceId, resource) => {
        set((state) => {
            return {
                loadedResource: {
                    ...state.loadedResource,
                    [resourceId]: resource,
                },
            }
        })
    },
    removeLoadedResource: (resourceId) => {
        set((state) => {
            const loadedResource = { ...state.loadedResource }
            delete loadedResource[resourceId]
            return {
                loadedResource,
            }
        })
    },
}))
