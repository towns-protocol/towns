import { useEffect, useRef, useState } from 'react'
import { useImageStore } from 'use-towns-client'
import { getImageUrlFromStreamMetadata } from 'api/lib/fetchImage'

export const ImageVariants = {
    public: 'public',
    thumbnail100: 'thumbnail100',
    thumbnail50: 'thumbnail50',
    thumbnail300: 'thumbnail300',
    thumbnail600: 'thumbnail600',
} as const

export type ImageVariant = (typeof ImageVariants)[keyof typeof ImageVariants]

export const useImageSource = (resourceId: string, _variant: ImageVariant) => {
    const storedImageUrl = useImageStore((state) => state.loadedResource[resourceId]?.imageUrl)

    // TODO: image variant
    const externalImageUrl = getImageUrlFromStreamMetadata(resourceId)

    const [isLoaded, setImageLoaded] = useState(false)
    const [isError, setImageError] = useState<boolean | undefined>(undefined)
    const isLoading = !isLoaded && !isError

    const onLoad = () => {
        useImageStore
            .getState()
            .setLoadedResource(resourceId, { imageUrl: storedImageUrl || externalImageUrl })
        setImageLoaded(true)
    }

    const onError = () => {
        useImageStore.getState().addErroredResource(resourceId)
        setImageError(true)
    }

    const storedImageUrlRef = useRef(storedImageUrl)

    // reset image loading when a new image is uploaded
    useEffect(() => {
        if (storedImageUrlRef.current === storedImageUrl) {
            // prevent reset on initial mount, otherwise state might get reset wrongly
            return
        }
        if (storedImageUrl === externalImageUrl) {
            storedImageUrlRef.current = storedImageUrl
        }
        if (storedImageUrl !== externalImageUrl && storedImageUrl !== storedImageUrlRef.current) {
            storedImageUrlRef.current = storedImageUrl
            setImageLoaded(false)
            setImageError(undefined)
        }
    }, [externalImageUrl, storedImageUrl])

    return {
        isLoaded,
        onLoad,
        onError,
        isError,
        isLoading,
        // TODO: temporary cache busting
        // new images eventually show up, but the browser caches them and users who upload anything might see their old image for a while, even after refreshing
        // We're calling images directly from imagedelivery.net, we can't modify those headers unless we use some proxy - will need to revisit the CF worker or add a service worker interceptor
        imageSrc: storedImageUrl || externalImageUrl,
    }
}
